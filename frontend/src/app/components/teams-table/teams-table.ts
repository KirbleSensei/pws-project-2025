import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule, Sort } from '@angular/material/sort';

import { Team } from '../../models/team'
import { TeamsService } from '../../services/teams';
import { EditTeamDialog } from '../../dialogs/edit-team/edit-team';
import { ColorsService } from '../../services/colors';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'teams-table',
  templateUrl: './teams-table.html',
  styleUrls: ['./teams-table.scss'],
  imports: [CommonModule, MatSortModule, MatTableModule, MatChipsModule, MatProgressSpinnerModule],
  standalone: true
})
export class TeamsTableComponent {
  displayedColumns: string[] = ['id', 'name', 'avatar', 'longname', 'member_count'];
  teams: Team[] = [];
  private sub?: Subscription;
  getContrastColor: (color: string) => string;
  user: User | null = null;
  loading: boolean = false;
  timestamp = Date.now();
  order: number = 1;

  @Input() filter: string = '';
  
  constructor(private authService: AuthService, private colorsService: ColorsService, private teamsService: TeamsService, private dialog: MatDialog, private snackBar: MatSnackBar) {
    this.authService.currentUser$.subscribe(user => { this.user = user });
    this.getContrastColor = this.colorsService.getContrastColor;
  }
  
  ngOnInit() {
    this.sub = this.teamsService.reload$.subscribe(() => this.loadData());
  }

  loadData() {
    this.loading = true;
    this.teamsService.getTeams(this.filter, this.order).subscribe({
      next: (data) => {
        this.loading = false;
        this.teams = data;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err?.error?.message ?? err?.message ?? 'Unknown error', 'Close', {
                        duration: 5000,
                        panelClass: ['snackbar-error']
                    });
      },
    });
  }

  openDialog(row: Team | null) {
    if (!this.isInRole([0])) return;
    const dialogRef = this.dialog.open(EditTeamDialog, {
      width: '100%',
      maxWidth: '75vw',
      data: { row }
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.timestamp = Date.now();
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  isInRole(roles: number[]) {
    return this.authService.isInRole(this.user, roles);
  }

  onSortChange(sort: Sort) {
    const columnNo = parseInt(sort.active);
    if(columnNo) {
      switch(sort.direction) {
        case 'asc':
          this.order = columnNo;
          this.loadData();
          break;
        case 'desc':
          this.order = -columnNo;
          this.loadData();
          break;
      }
    }
  }
}
