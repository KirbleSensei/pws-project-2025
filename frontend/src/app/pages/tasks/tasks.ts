import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime } from 'rxjs';

import { AuthService } from '../../services/auth';
import { TasksService } from '../../services/tasks';
import { TeamsService } from '../../services/teams';
import { Team } from '../../models/team';
import { User } from '../../models/user';
import { TasksTableComponent } from '../../components/tasks-table/tasks-table';
import { EditTaskDialog } from '../../dialogs/edit-task/edit-task';

@Component({
  selector: 'tasks-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatInputModule, MatSelectModule, ReactiveFormsModule, TasksTableComponent],
  templateUrl: './tasks.html',
  styleUrls: ['./tasks.scss']
})
export class TasksPage {
  filterControl = new FormControl('');
  teamFilterControl = new FormControl<number[]>([]);
  teams: Team[] = [];
  user: User | null = null;

  constructor(private authService: AuthService, private tasksService: TasksService, private teamsService: TeamsService, private dialog: MatDialog) {
    this.authService.currentUser$.subscribe(user => this.user = user);
    this.filterControl.valueChanges.pipe(debounceTime(200)).subscribe(() => this.tasksService.notifyReload());
    this.teamFilterControl.valueChanges.subscribe(() => this.tasksService.notifyReload());
  }

  ngOnInit() {
    this.teamsService.getTeams('', 1).subscribe(teams => this.teams = teams);
  }

  openDialog() {
    this.dialog.open(EditTaskDialog, { width: '75%', minWidth: '800px', data: { row: null } });
  }

  isInRole(roles: number[]) {
    return this.authService.isInRole(this.user, roles);
  }
}
