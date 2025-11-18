import { Component } from '@angular/core';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { TimerComponent } from '../../features/timer/timer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeaderComponent, TimerComponent],
  templateUrl: './home.component.html',
  styles: []
})
export class HomeComponent {}
