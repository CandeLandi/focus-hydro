import { TestBed } from '@angular/core/testing';
import { WaterBottleComponent } from './water-bottle.component';

describe('WaterBottleComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaterBottleComponent]
    })
      .overrideComponent(WaterBottleComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('empties during focus progress', () => {
    const fixture = TestBed.createComponent(WaterBottleComponent);
    fixture.componentRef.setInput('progress', 25);
    fixture.componentRef.setInput('isBreak', false);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.waterLevel()).toBe(75);
    expect(component.waterHeight()).toBeCloseTo(155.25);
    expect(component.shouldShowWaves()).toBeTrue();
    expect(component.shouldShowMoreBubbles()).toBeTrue();
  });

  it('fills during break progress and clamps values', () => {
    const fixture = TestBed.createComponent(WaterBottleComponent);
    fixture.componentRef.setInput('progress', 150);
    fixture.componentRef.setInput('isBreak', true);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.waterLevel()).toBe(100);
    expect(component.waterY()).toBe(94);
    expect(component.ringOffset()).toBeCloseTo(0);
  });

  it('hides waves and bubbles for very low water', () => {
    const fixture = TestBed.createComponent(WaterBottleComponent);
    fixture.componentRef.setInput('progress', 99);
    fixture.componentRef.setInput('isBreak', false);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.waterLevel()).toBe(1);
    expect(component.shouldShowWaves()).toBeFalse();
    expect(component.shouldShowBubbles()).toBeFalse();
    expect(component.waterSurfacePath()).toContain('M 49');
  });
});
