import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, Subscription } from 'rxjs';

import { AuthService } from '../../services/auth';
import { TasksService } from '../../services/tasks';
import { TeamsService } from '../../services/teams';
import { Team } from '../../models/team';
import { User } from '../../models/user';
import { TasksTableComponent } from '../../components/tasks-table/tasks-table';
import { EditTaskDialog } from '../../dialogs/edit-task/edit-task';
import { Task } from '../../models/task';

interface GanttTask {
  id: number;
  name: string;
  teamName: string;
  personName: string;
  color: string;
  startLabel: string;
  endLabel: string;
  leftPct: number;
  widthPct: number;
}

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

  ganttTasks: GanttTask[] = [];
  ganttFromLabel = '';
  ganttToLabel = '';

  private sub?: Subscription;

  constructor(private authService: AuthService, private tasksService: TasksService, private teamsService: TeamsService, private dialog: MatDialog) {
    this.authService.currentUser$.subscribe(user => this.user = user);
    this.filterControl.valueChanges.pipe(debounceTime(200)).subscribe(() => this.tasksService.notifyReload());
    this.teamFilterControl.valueChanges.subscribe(() => this.tasksService.notifyReload());
  }

  ngOnInit() {
    this.teamsService.getTeams('', 1).subscribe(teams => this.teams = teams);
    this.sub = this.tasksService.reload$.subscribe(() => this.loadGantt());
    // force first load to make the timeline visible immediately
    this.loadGantt();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  openDialog() {
    this.dialog.open(EditTaskDialog, { width: '75%', minWidth: '800px', data: { row: null } });
  }

  isInRole(roles: number[]) {
    return this.authService.isInRole(this.user, roles);
  }

  private loadGantt() {
    this.tasksService.getTasks(this.filterControl.value || '', 5, this.teamFilterControl.value || []).subscribe(tasks => {
      this.buildGantt(tasks);
    });
  }

  private buildGantt(tasks: Task[]) {
    if (tasks.length === 0) {
      this.ganttTasks = [];
      this.ganttFromLabel = '';
      this.ganttToLabel = '';
      return;
    }

    const nowMs = Date.now();
    const starts = tasks.map(task => new Date(task.start_date).getTime());
    const minStart = Math.min(...starts);
    const span = Math.max(nowMs - minStart, 1);

    this.ganttFromLabel = new Date(minStart).toLocaleDateString();
    this.ganttToLabel = new Date(nowMs).toLocaleDateString();

    this.ganttTasks = tasks
      .map(task => {
        const startMs = new Date(task.start_date).getTime();
        const endMs = task.end_date ? new Date(task.end_date).getTime() : nowMs;
        const leftPct = ((startMs - minStart) / span) * 100;
        const widthPct = (Math.max(endMs, startMs) - startMs) / span * 100;

        return {
          id: task.id,
          name: task.name,
          teamName: task.team_name || `#${task.team_id}`,
          personName: task.person_name || `#${task.person_id}`,
          color: task.team_color || '#757575',
          startLabel: new Date(startMs).toLocaleDateString(),
          endLabel: task.end_date ? new Date(endMs).toLocaleDateString() : 'ongoing',
          leftPct: Math.max(0, Math.min(100, leftPct)),
          widthPct: Math.max(0.5, Math.min(100, widthPct || 0.5))
        };
      })
      .sort((a, b) => a.leftPct - b.leftPct);
  }
}
