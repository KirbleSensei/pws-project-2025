import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

import { AdminService, ChangeLogEntry } from '../../services/admin';

@Component({
  selector: 'admin-changes-page',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule],
  templateUrl: './admin-changes.html'
})
export class AdminChangesPage {
  displayedColumns = ['id', 'created_at', 'username', 'table_name', 'operation', 'row_id', 'payload'];
  changes: ChangeLogEntry[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.adminService.getChanges(300).subscribe(changes => this.changes = changes);
  }
}
