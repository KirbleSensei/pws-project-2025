import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { AdminService, ActiveUserSession } from '../../services/admin';
import { WebsocketService } from '../../services/websocket';

@Component({
  selector: 'admin-users-page',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule],
  templateUrl: './admin-users.html'
})
export class AdminUsersPage {
  displayedColumns = ['username', 'roles', 'expire', 'expired', 'action'];
  sessions: ActiveUserSession[] = [];

  constructor(private adminService: AdminService, private websocketService: WebsocketService) {
    this.websocketService.messages$.subscribe(msg => {
      if (msg.type === 'active_users_changed') {
        this.load();
      }
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.adminService.getActiveUsers().subscribe(sessions => this.sessions = sessions);
  }

  onForceLogout(session: ActiveUserSession) {
    this.adminService.forceLogout(session.sid).subscribe(() => this.load());
  }
}
