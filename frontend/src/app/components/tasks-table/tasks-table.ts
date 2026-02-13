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
import { AdminService } from '../../services/admin';

@Component({
  selector: 'tasks-table',
  templateUrl: './tasks-table.html',
  styleUrls: ['./tasks-table.scss'],
  imports: [CommonModule, MatTableModule, MatSortModule],
  standalone: true
})
export class TasksTableComponent {
  private _filter: string = '';
  private _teamIds: number[] = [];

  @Input()
  set filter(value: string) {
    const next = value ?? '';
    if (next !== this._filter) {
      this._filter = next;
      this.loadData();
    }
  }

  @Input()
  set teamIds(value: number[]) {
    const next = Array.isArray(value) ? [...value].sort((a, b) => a - b) : [];
    if (!this.sameIds(next, this._teamIds)) {
      this._teamIds = next;
      this.loadData();
    }
  }

  displayedColumns: string[] = ['id', 'name', 'team', 'person', 'start_date', 'end_date'];
  tasks: Task[] = [];
  loading = false;
  order = 1;
  user: User | null = null;
  private sub?: Subscription;

  constructor(private tasksService: TasksService, private authService: AuthService, private dialog: MatDialog, private snackBar: MatSnackBar, private adminService: AdminService) {
    this.authService.currentUser$.subscribe(user => this.user = user);
  }

  ngOnInit() {
    this.sub = this.tasksService.reload$.subscribe(() => this.loadData());
    this.loadData();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private sameIds(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  }

  loadData() {
    this.loading = true;
    this.tasksService.getTasks(this._filter, this.order, this._teamIds).subscribe({
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
    this.adminService.acquireLock('edit-task').subscribe({
      next: () => {
        const dialogRef = this.dialog.open(EditTaskDialog, {
          width: '75%',
          minWidth: '800px',
          data: { row }
        });
        dialogRef.afterClosed().subscribe(() => this.adminService.releaseLock('edit-task').subscribe());
      },
      error: err => {
        this.snackBar.open(err?.error?.message ?? 'Another admin is editing a task now', 'Close', {
          duration: 5000,
          panelClass: ['snackbar-warning']
        });
      }
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
