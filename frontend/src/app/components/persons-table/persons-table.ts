import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, ViewChild, OnDestroy, Output, EventEmitter } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';

import { Person } from '../../models/person';
import { PersonsService } from '../../services/persons';
import { EditPersonDialog } from '../../dialogs/edit-person/edit-person';
import { ColorsService } from '../../services/colors';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'persons-table',
  templateUrl: './persons-table.html',
  styleUrls: ['./persons-table.scss'],
  imports: [CommonModule, MatTableModule, MatSortModule, MatChipsModule, MatProgressSpinnerModule],
  standalone: true
})
export class PersonsTableComponent implements AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['id', 'firstname', 'lastname', 'birthdate', 'email', 'teams'];
  persons: Person[] = [];
  private observer?: IntersectionObserver;

  private _filter: string = '';
  @Input()
  set filter(value: string) {
    if (value !== this._filter) {
      this._filter = value;
      this.resetAndLoad();
    }
  } // set private component _filter if parent component changes value of filter

  @Output() countsChange = new EventEmitter<{ total: number, filtered: number, order: number }>();
  
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;

  getContrastColor: (color: string) => string;
  user: User | null = null;
  loading: boolean = false;
  allLoaded: boolean = false;
  offset: number = 0;
  limit: number = 10;
  order: number = 1;
  timestamp = Date.now();

  @ViewChild('loadMore') loadMore!: ElementRef;

  constructor(
    private authService: AuthService,
    private colorsService: ColorsService,
    private personsService: PersonsService,
    private dialog: MatDialog
  ) {
    this.authService.currentUser$.subscribe(user => { this.user = user; });
    this.getContrastColor = this.colorsService.getContrastColor;
  }

  ngAfterViewInit() {
    this.initObserver();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  openDialog(row: Person | null) {
    if (!this.isInRole([0])) return;
    row!.team_ids = row?.team_objects?.map(team => team.id);

    const scrollTop = this.tableContainer?.nativeElement.scrollTop || 0; // remember current position
    const dialogRef = this.dialog.open(EditPersonDialog, {
      width: '75%',
      minWidth: '800px',
      data: { row }
    });
    dialogRef.afterClosed().subscribe(result => {
      if(result) {
        this.timestamp = Date.now();
        this.resetAndLoad();
        this.tableContainer!.nativeElement.scrollTop = scrollTop;
      }
    })
  }

  isInRole(roles: number[]) {
    return this.authService.isInRole(this.user, roles);
  }

  private resetAndLoad() {
    this.persons = [];
    this.offset = 0;
    this.allLoaded = false;
    this.loadData();
  }

  private initObserver() {
    if (!this.loadMore) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        this.loadData();
      }
    });
    this.observer.observe(this.loadMore.nativeElement);
  }

  loadData() {
    if (this.loading || this.allLoaded) return;

    this.loading = true;

    this.personsService.getPersons(this._filter, this.limit, this.offset, this.order)
      .subscribe(response => {
        this.countsChange.emit({ total: response.total, filtered: response.filtered, order: this.order }); // send changed counters to parent
        const persons = response.persons;

        if (persons.length < this.limit) {
          this.allLoaded = true;
        }

        this.persons = [...this.persons, ...persons];
        this.offset += this.limit;
        this.loading = false;

        this.checkFillViewport();
      });
  }

  private checkFillViewport() {
    requestAnimationFrame(() => {
      if (!this.loadMore || this.allLoaded) return;
      const rect = this.loadMore.nativeElement.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        // sentinel still visible - read more records
        this.loadData();
      }
    });
  }
  
  onSortChange(sort: Sort) {
    const columnNo = parseInt(sort.active);
    if(columnNo) {
      switch(sort.direction) {
        case 'asc':
          this.order = columnNo;
          this.resetAndLoad();
          break;
        case 'desc':
          this.order = -columnNo;
          this.resetAndLoad();
          break;
      }
    }
  }
}
