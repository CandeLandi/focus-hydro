import { TestBed } from '@angular/core/testing';
import { CelebrationDialogComponent } from './celebration-dialog.component';
import { ImageGeneratorService } from '../../core/services/image-generator.service';
import { CelebrationStats } from '../../shared/models/celebration.model';

class ImageGeneratorServiceMock {
  generateLinkedInImage = jasmine.createSpy('generateLinkedInImage').and.resolveTo('data:image/png;base64,ok');
  downloadImage = jasmine.createSpy('downloadImage');
}

describe('CelebrationDialogComponent', () => {
  let imageGenerator: ImageGeneratorServiceMock;

  const stats: CelebrationStats = {
    tasksCompleted: 2,
    totalFocusTime: '50m',
    completionPercentage: 100,
    date: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CelebrationDialogComponent],
      providers: [{ provide: ImageGeneratorService, useClass: ImageGeneratorServiceMock }]
    })
      .overrideComponent(CelebrationDialogComponent, { set: { template: '' } })
      .compileComponents();
    imageGenerator = TestBed.inject(ImageGeneratorService) as unknown as ImageGeneratorServiceMock;
  });

  it('emits close events', () => {
    const fixture = TestBed.createComponent(CelebrationDialogComponent);
    const component = fixture.componentInstance;
    const visibleSpy = spyOn(component.visibleChange, 'emit');

    component.visible = true;
    component.onClose();

    expect(component.visible).toBeFalse();
    expect(visibleSpy).toHaveBeenCalledWith(false);
  });

  it('emits close day requests', () => {
    const component = TestBed.createComponent(CelebrationDialogComponent).componentInstance;
    const closeDaySpy = spyOn(component.closeDayRequest, 'emit');

    component.onCloseDay();

    expect(closeDaySpy).toHaveBeenCalled();
  });

  it('downloads the generated achievement image', async () => {
    const component = TestBed.createComponent(CelebrationDialogComponent).componentInstance;
    component.stats = stats;

    await component.onDownloadImage();

    expect(imageGenerator.generateLinkedInImage).toHaveBeenCalledWith(stats);
    expect(imageGenerator.downloadImage).toHaveBeenCalledWith('data:image/png;base64,ok', jasmine.stringMatching(/^focusflow-logro-/));
    expect(component.isGeneratingImage()).toBeFalse();
  });

  it('does nothing when stats are missing', async () => {
    const component = TestBed.createComponent(CelebrationDialogComponent).componentInstance;

    await component.onDownloadImage();

    expect(imageGenerator.generateLinkedInImage).not.toHaveBeenCalled();
  });
});
