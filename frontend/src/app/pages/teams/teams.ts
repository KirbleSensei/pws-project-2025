import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';

import { TeamsTableComponent } from '../../components/teams-table/teams-table';
import { EditTeamDialog } from '../../dialogs/edit-team/edit-team';
import { TeamsService } from '../../services/teams';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';

@Component({
    selector: 'teams-page',
    imports: [MatButtonModule, MatInputModule, MatIconModule, ReactiveFormsModule, TeamsTableComponent],
    templateUrl: './teams.html',
    styleUrls: ['./teams.scss'],
    standalone: true
})
export class TeamsPage {
    filterControl = new FormControl('');
    user: User | null = null;

    constructor(private authService: AuthService, private dialog: MatDialog, private teamsService: TeamsService) {
        this.authService.currentUser$.subscribe(user => { this.user = user });
        this.filterControl.valueChanges.
            pipe(debounceTime(200)).
            subscribe(value => {
                this.teamsService.notifyReload();
            });
    }

    openDialog() {
        const dialogRef = this.dialog.open(EditTeamDialog, {
            width: '100%',
            maxWidth: '75vw',
            data: { row: null }
        });
        dialogRef.afterClosed().subscribe(result => {
            if(!result) return;
            this.filterControl.patchValue(result + ' '); // display only record just added
        });
    }
    
    isInRole(roles: number[]) {
           return this.authService.isInRole(this.user, roles);
    }
}
