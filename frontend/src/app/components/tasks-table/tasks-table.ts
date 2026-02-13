import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Subscription } from 'rxjs';

import { Task } from '../../models/task';
import { TasksService } from '../../services/tasks';
import { EditTaskDialog } from '../../dialogs/edit-task/edit-task';
import { AuthService } from '../../services/auth';
import { User } from '../../models/user';

@Component({
  selector: 'tasks-table',
  templateUrl: './tasks-table.html',
  styleUrls: ['./tasks-table.scss'],
  imports: [CommonModule, MatTableModule, MatSortModule],
  standalone: true
})
export class TasksTableComponent {
  @Input() filter: string = '';
  @Input() teamIds: number[] = [];

  displayedColumns: string[] = ['id', 'name', 'team', 'person', 'start_date', 'end_date'];
  tasks: Task[] = [];
  loading = false;
  order = 1;
  user: User | null = null;
  private sub?: Subscription;

  constructor(private tasksService: TasksService, private authService: AuthService, private dialog: MatDialog, private snackBar: MatSnackBar) {
    this.authService.currentUser$.subscribe(user => this.user = user);
  }

  ngOnInit() {
    this.sub = this.tasksService.reload$.subscribe(() => this.loadData());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  loadData() {
    this.loading = true;
    this.tasksService.getTasks(this.filter, this.order, this.teamIds).subscribe({
      next: tasks => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.snackBar.open(err?.error?.message ?? err?.message ?? 'Unknown error', 'Close', { duration: 5000, panelClass: ['snackbar-error'] });
      }
    });
  }

  openDialog(row: Task | null) {
    if (!this.authService.isInRole(this.user, [0])) return;
    this.dialog.open(EditTaskDialog, {
      width: '75%',
      minWidth: '800px',
      data: { row }
    });
  }

  onSortChange(sort: Sort) {
    const columnNo = parseInt(sort.active);
    if (!columnNo) return;
    if (sort.direction === 'asc') this.order = columnNo;
    if (sort.direction === 'desc') this.order = -columnNo;
    this.loadData();
  }
}
