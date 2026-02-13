import { Component, ViewChild, HostListener } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

import 'chart.js/auto';

import { AuthService } from '../../services/auth';
import { TeamsService } from '../../services/teams';
import { User } from '../../models/user';
import { CommonModule } from '@angular/common';
import { WebsocketService, WSMessage } from '../../services/websocket';
import { map, pipe, Subscription } from 'rxjs';

@Component({
  selector: 'home-page',
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  standalone: true
})
export class HomePage {

  user: User | null = null;
  private sub?: Subscription;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @HostListener('window:resize')
    onResize() {
    this.chart?.chart?.resize();
  }
  
  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Number of members',
        data: [],
        backgroundColor: [],
      }
    ]
  };

  chartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      y: {
        title: { display: true, text: 'Number of members' },
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      title: { display: true, text: 'Teams chart', font: { size: 24 }, },
      legend: { display: false }
    }
  };

  constructor(private authService: AuthService, private teamsService: TeamsService, private websocketService: WebsocketService) {
    this.authService.currentUser$.subscribe(user => { 
      this.user = user;
      if(this.isInRole([0,1])) {
        this.teamsService.getTeams("", 3).subscribe(teams => {
          this.chartData.labels = teams.map(team => (team.name));
          this.chartData.datasets[0].data = teams.map(team => (team.member_count ?? 0));
          this.chartData.datasets[0].backgroundColor = teams.map(team => (team.color ?? 0));
          this.chart?.update();
        });
      }
    });
  }

  isInRole(roles: number[]) {
    return this.authService.isInRole(this.user, roles);
  }

  ngOnInit(): void {
    this.sub = this.websocketService.messages$.pipe(
        map(msg => typeof msg === 'string' ? JSON.parse(msg) as WSMessage : msg)
    ).subscribe(msg => {
      console.log('WebSocket message received:', msg);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}