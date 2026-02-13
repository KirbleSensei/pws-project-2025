import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamFormComponent } from '../../components/team-form/team-form';
import { Team } from '../../models/team';
import { TeamsService } from '../../services/teams';

@Component({
  selector: 'edit-team',
  standalone: true,
  imports: [ MatDialogModule, TeamFormComponent ],
  templateUrl: './edit-team.html',
  styleUrls: ['./edit-team.scss']
})
export class EditTeamDialog {

    @ViewChild(TeamFormComponent) teamForm!: TeamFormComponent;

    formValid: boolean = false;
    uploading: boolean = false;
    uploadProgress: number = 0;

    constructor(
        private snackBar: MatSnackBar,
        private dialogRef: MatDialogRef<EditTeamDialog>,
        private teamsService: TeamsService,
        @Inject(MAT_DIALOG_DATA) public data: { row: Team }
    ) {}

    onAdd(): void {
        if (this.teamForm.form.valid) {
            const newTeam: Team = this.teamForm.form.value;
            this.teamsService.newTeam(newTeam, this.teamForm.selectedFile).subscribe({
                next: team => {
                    this.teamsService.notifyReload(); // notify other components to reload the list
                    this.snackBar.open(`Team ${team.id} added`, 'Close', {
                        duration: 5000,
                        panelClass: ['snackbar-success']
                    });
                    this.dialogRef.close(team.id);
                },
                error: err => {
                    this.snackBar.open(err?.error?.message ?? err?.message ?? 'Unknown error', 'Close', {
                        duration: 5000,
                        panelClass: ['snackbar-error']
                    });
                    this.dialogRef.close();
                }
            });
        }
    }

    onModify(): void {
        if (this.teamForm.form.valid) {
            const updatedTeam: Team = this.teamForm.form.value;
            updatedTeam.id = this.data.row.id;
            this.teamsService.modifyTeam(updatedTeam, this.teamForm.selectedFile).subscribe({
                next: team => {
                    this.teamsService.notifyReload(); // notify
                    this.snackBar.open(`Team ${team.id} modified`, 'Close', {
                        duration: 5000,
                        panelClass: ['snackbar-success']
                    });
                    this.dialogRef.close(team.id);
                },
                error: err => {
                    this.snackBar.open(err?.error?.message ?? err?.message ?? 'Unknown error', 'Close', {
                        duration: 5000,
                        panelClass: ['snackbar-error']
                    });
                    this.dialogRef.close();
                }
            });
        }
    }

    onDelete() {
        this.teamsService.deleteTeam(this.data.row.id).subscribe({
            next: team => {
                this.teamsService.notifyReload(); // notify other components to reload the list
                this.snackBar.open(`Team ${team.id} deleted`, 'Close', {
                    duration: 5000,
                    panelClass: ['snackbar-success']
                });
                this.dialogRef.close(team.id);
            },
            error: err => {
                this.snackBar.open(err?.error?.message ?? err?.message ?? 'Unknown error', 'Close', {
                    duration: 5000,
                    panelClass: ['snackbar-error']
                });
                this.dialogRef.close();
            }
        });
    }

    onFormValidChange(valid: boolean) {
        this.formValid = valid;
    }
}