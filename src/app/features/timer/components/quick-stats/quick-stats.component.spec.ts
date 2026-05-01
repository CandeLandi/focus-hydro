import { TestBed } from '@angular/core/testing';
import { QuickStatsComponent } from './quick-stats.component';

describe('Feature QuickStatsComponent', () => {
  it('creates with default stats and accepts input stats', async () => {
    await TestBed.configureTestingModule({
      imports: [QuickStatsComponent]
    })
      .overrideComponent(QuickStatsComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(QuickStatsComponent);
    const component = fixture.componentInstance;

    expect(component.stats.completedToday).toBe(0);

    component.stats = { completedToday: 3, totalFocusTime: '1h', progress: 80 };
    expect(component.stats.progress).toBe(80);
  });
});
