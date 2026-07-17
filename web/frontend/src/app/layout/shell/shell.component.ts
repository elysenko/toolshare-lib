import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  private readonly allNav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Tools', path: '/tools', icon: '🔧' },
    { label: 'Loans', path: '/loans', icon: '📄' },
    { label: 'Reservations', path: '/reservations', icon: '🔖' },
    { label: 'Settings', path: '/admin/settings', icon: '⚙️', adminOnly: true },
  ];

  readonly navItems = computed(() =>
    this.allNav.filter((n) => !n.adminOnly || this.auth.isAdmin()),
  );

  readonly user = this.auth.currentUser;

  constructor(private auth: AuthService) {}

  logout(): void {
    this.auth.logout();
  }
}
