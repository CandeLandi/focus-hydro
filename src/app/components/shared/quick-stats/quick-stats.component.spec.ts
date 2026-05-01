import { TestBed } from '@angular/core/testing';
import { QuickStatsComponent, StatCard } from './quick-stats.component';

describe('Shared QuickStatsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickStatsComponent]
    })
      .overrideComponent(QuickStatsComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('identifies green stats as highlights', () => {
    const component = TestBed.createComponent(QuickStatsComponent).componentInstance;
    const highlighted: StatCard = { value: '1h', label: 'focus', color: 'green' };
    const regular: StatCard = { value: 3, label: 'sessions', color: 'blue' };

    expect(component.isHighlight(highlighted)).toBeTrue();
    expect(component.isHighlight(regular)).toBeFalse();
  });
});
