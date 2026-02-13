import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Task } from '../../models/task';
import { Team } from '../../models/team';
import { Person } from '../../models/person';
import { TeamsService } from '../../services/teams';
import { PersonsService } from '../../services/persons';

const taskDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const startDate = control.get('start_date')?.value ? new Date(control.get('start_date')?.value) : null;
  const endDateRaw = control.get('end_date')?.value;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const now = new Date();

  if (!startDate || isNaN(startDate.getTime())) {
    return { startDateInvalid: true };
  }
  if (startDate > now) {
    return { startDateFuture: true };
  }
  if (endDate) {
    if (isNaN(endDate.getTime())) return { endDateInvalid: true };
    if (endDate > now) return { endDateFuture: true };
    if (endDate < startDate) return { endDateBeforeStart: true };
  }
  return null;
};

@Component({
  selector: 'task-form',
  templateUrl: './task-form.html',
  styleUrls: ['./task-form.scss'],
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatInputModule, MatDatepickerModule, MatSelectModule],
  standalone: true
})
export class TaskFormComponent {
  @Input() row!: Task;
  @Output() validChange = new EventEmitter<boolean>();

  form: FormGroup;
  teams: Team[] = [];
  persons: Person[] = [];
  teamPersons: Person[] = [];

  constructor(private fb: FormBuilder, private teamsService: TeamsService, private personsService: PersonsService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      team_id: [null, Validators.required],
      person_id: [null, Validators.required],
      start_date: [null, Validators.required],
      end_date: [null]
    }, { validators: taskDateValidator });

    this.form.statusChanges.subscribe(() => this.validChange.emit(this.form.valid));
    this.form.get('team_id')?.valueChanges.subscribe(teamId => {
      this.updateTeamPersons(teamId);
      const personId = this.form.get('person_id')?.value;
      if (personId && !this.teamPersons.some(p => p.id === personId)) {
        this.form.patchValue({ person_id: null });
      }
    });
  }

  ngOnInit() {
    this.teamsService.getTeams('', 1).subscribe(teams => this.teams = teams);
    this.personsService.getPersons('', 0, 0, 1).subscribe(response => {
      this.persons = response.persons;
      this.updateTeamPersons(this.form.get('team_id')?.value);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['row'] && this.row) {
      this.form.patchValue({
        ...this.row,
        start_date: new Date(this.row.start_date),
        end_date: this.row.end_date ? new Date(this.row.end_date) : null
      });
      this.updateTeamPersons(this.row.team_id);
      this.validChange.emit(this.form.valid);
    }
  }

  private updateTeamPersons(teamId: number | null) {
    if (!teamId) {
      this.teamPersons = [];
      return;
    }
    this.teamPersons = this.persons.filter(person => person.team_objects?.some(team => team.id === teamId));
  }
}
