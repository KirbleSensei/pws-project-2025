import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = (pdfFonts as any).vfs;

import { PersonsTableComponent } from '../../components/persons-table/persons-table';
import { EditPersonDialog } from '../../dialogs/edit-person/edit-person';
import { PersonsService } from '../../services/persons';
import { debounceTime } from 'rxjs';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';

@Component({
    selector: 'persons-page',
    imports: [
        MatButtonModule, MatInputModule, MatSelectModule,MatIconModule, MatBadgeModule, 
        FormsModule, ReactiveFormsModule, 
        PersonsTableComponent
    ],
    templateUrl: './persons.html',
    styleUrls: ['./persons.scss'],
    standalone: true
})
export class PersonsPage {
    filterControl = new FormControl('');
    user: User | null = null;
    total: number = 0;
    filtered: number = 0;
    order: number = 1;
    
    constructor(private authService: AuthService, private personsService: PersonsService, private dialog: MatDialog) {
        this.authService.currentUser$.subscribe(user => { this.user = user });
        this.filterControl.valueChanges.
            pipe(debounceTime(200)).
            subscribe(value => {
                this.personsService.notifyReload();
            });
    }

    openDialog() {
        const dialogRef = this.dialog.open(EditPersonDialog, { // new person dialog
            width: '75%',
            minWidth: '800px',
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

    onCountsChange(counts: { total: number, filtered: number, order: number }) {
        this.total = counts.total;
        this.filtered = counts.filtered;
        this.order = counts.order;
    }

    makeReport(all: boolean = true) {
        const filter = all ? '' : this.filterControl.value ?? '';
        this.personsService.getPersons(filter, 0, 0, this.order).subscribe(response => {

            const tableHeader = ['ID', 'Firstname', 'Lastname', 'Birthdate', 'Email', 'Teams'];

            const tableBody = response.persons.map(person => [
                person.id.toString(),
                person.firstname,
                person.lastname,
                new Date(person.birthdate).toLocaleDateString(),
                person.email,
                person.team_objects?.map(t => t.name).join(', ') ?? ''
            ]);

            const doc: any = {
                pageOrientation: 'landscape',
                content: [
                    { text: 'Persons', style: 'header' },
                    { text: (filter ? 'filtered by ' + filter : 'all') + ` ${response.filtered} rows`, style: 'subheader' },
                    { text: 'generated at ' + new Date().toLocaleDateString(), alignment: 'right' },
                    { table: {
                        headerRows: 1,
                        widths: ['auto','auto','auto','auto','auto','*'],
                        body: [tableHeader, ...tableBody]
                    }}
                ],
                styles: {
                    header: { fontSize: 22, bold: true },
                    subheader: { fontSize: 16, bold: true }
                }
            }
            pdfMake.createPdf(doc).download('persons.pdf');
        });
    }
}