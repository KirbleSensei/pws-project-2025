import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { APP_VERSION } from '../../../src/shared/version';
import { AppRoute, routes } from './app.routes';
import { User } from './models/user';
import { AuthService } from './services/auth';
import { LoginDialog } from './dialogs/login/login';
import { WebsocketService } from './services/websocket';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  title: string = APP_VERSION;
  routes = routes;
  user: User | null = null;
  loading: boolean = true;
  generalError: string = '';

  constructor (private router: Router, private authService: AuthService, private dialog: MatDialog, private websocketService: WebsocketService, private snackbar: MatSnackBar) {
    this.authService.currentUser$.subscribe(u => (this.user = u));
    this.websocketService.messages$.subscribe(msg => {
      if(msg.type == 'login') {
        this.snackbar.open(msg.data, 'Close', {
                        duration: 5000,
                        panelClass: ['snackbar-warning']
                    });
      }
    })
  }

  ngOnInit() {
    this.authService.whoami().subscribe({
      next: () => {
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.generalError = 'Failed to connect to the backend server';
      }
    });
  }

  onLogin() {
    const dialogRef = this.dialog.open(LoginDialog, {
      width: '33%'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result === 'success') {
        this.router.navigate(['/']);
      }
    });
  }

  onLogout() {
    this.authService.logout().subscribe();
    this.router.navigate(['/']);
  }
  
  isRouteAvailable(route: AppRoute): boolean {
    return this.authService.isRouteAvailable(this.user!, route);
  }
}
