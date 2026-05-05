import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { ImageGeneratorService } from './image-generator.service';
import { CelebrationStats } from '../../shared/models/celebration.model';

/** Minimal share-card translations for deterministic canvas tests */
const SHARE_CARD_ES: Record<string, string> = {
  'shareCard.hashtag': '#FocusFlow',
  'shareCard.titleObjective': 'Objetivo ',
  'shareCard.titleDone': 'cumplido',
  'shareCard.subtitlePart1': 'Pequeñas decisiones diarias, ',
  'shareCard.subtitlePart2': 'grandes cambios.',
  'shareCard.statsTasksSingular': 'TAREA COMPLETADA',
  'shareCard.statsTasksPlural': 'TAREAS COMPLETADAS',
  'shareCard.statsFocus': 'DE FOCO',
  'shareCard.statsProgress': 'PROGRESO',
  'shareCard.hydrationLead': 'Enfoque + hidratación + constancia = ',
  'shareCard.hydrationHighlight': 'tu mejor versión.',
  'shareCard.hydrationTagline': '',
  'shareCard.footerTagline': 'Temporizador Pomodoro'
};

describe('ImageGeneratorService', () => {
  let service: ImageGeneratorService;
  const stats: CelebrationStats = {
    tasksCompleted: 2,
    totalFocusTime: '50m',
    completionPercentage: 100,
    date: new Date('2026-04-28T10:00:00'),
    displayName: 'Candela'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string, params?: Record<string, string>): string => {
              if (key === 'shareCard.progressBy' && params?.name) {
                return `Progreso de ${params.name}`;
              }
              return SHARE_CARD_ES[key] ?? key;
            }
          }
        }
      ]
    });
    service = TestBed.inject(ImageGeneratorService);
  });

  it('downloads generated images with the requested filename', () => {
    const anchor = document.createElement('a');
    const originalCreateElement = document.createElement.bind(document);
    const clickSpy = spyOn(anchor, 'click');
    spyOn(document, 'createElement').and.callFake((tagName: string): HTMLElement => {
      if (tagName === 'a') return anchor;
      return originalCreateElement(tagName);
    });

    service.downloadImage('data:image/png;base64,abc', 'summary.png');

    expect(anchor.download).toBe('summary.png');
    expect(anchor.href).toContain('data:image/png');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('throws when canvas context is unavailable', async () => {
    const canvas = document.createElement('canvas');
    const originalCreateElement = document.createElement.bind(document);
    spyOn(canvas, 'getContext').and.returnValue(null);
    spyOn(document, 'createElement').and.callFake((tagName: string): HTMLElement => {
      if (tagName === 'canvas') return canvas;
      return originalCreateElement(tagName);
    });

    await expectAsync(service.generateLinkedInImage(stats)).toBeRejectedWithError(
      '[FocusFlow] No se pudo obtener el contexto del canvas'
    );
  });

  it('renders a LinkedIn image data URL using canvas and image assets', async () => {
    const originalImage = window.Image;
    const canvas = document.createElement('canvas');
    const originalCreateElement = document.createElement.bind(document);
    const gradient = { addColorStop: jasmine.createSpy('addColorStop') } as unknown as CanvasGradient;
    const context = {
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: 'center',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      shadowColor: '',
      shadowBlur: 0,
      createLinearGradient: jasmine.createSpy('createLinearGradient').and.returnValue(gradient),
      createRadialGradient: jasmine.createSpy('createRadialGradient').and.returnValue(gradient),
      fillRect: jasmine.createSpy('fillRect'),
      save: jasmine.createSpy('save'),
      restore: jasmine.createSpy('restore'),
      translate: jasmine.createSpy('translate'),
      rotate: jasmine.createSpy('rotate'),
      scale: jasmine.createSpy('scale'),
      drawImage: jasmine.createSpy('drawImage'),
      fillText: jasmine.createSpy('fillText'),
      measureText: jasmine.createSpy('measureText').and.returnValue({ width: 120 }),
      beginPath: jasmine.createSpy('beginPath'),
      moveTo: jasmine.createSpy('moveTo'),
      lineTo: jasmine.createSpy('lineTo'),
      arcTo: jasmine.createSpy('arcTo'),
      quadraticCurveTo: jasmine.createSpy('quadraticCurveTo'),
      bezierCurveTo: jasmine.createSpy('bezierCurveTo'),
      closePath: jasmine.createSpy('closePath'),
      arc: jasmine.createSpy('arc'),
      fill: jasmine.createSpy('fill'),
      stroke: jasmine.createSpy('stroke')
    } as unknown as CanvasRenderingContext2D;
    spyOn(canvas, 'getContext').and.returnValue(context);
    spyOn(canvas, 'toDataURL').and.returnValue('data:image/png;base64,rendered');
    spyOn(document, 'createElement').and.callFake((tagName: string): HTMLElement => {
      if (tagName === 'canvas') return canvas;
      return originalCreateElement(tagName);
    });

    class FakeImage {
      width = 900;
      height = 700;
      onload: ((ev: Event) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(new Event('load')), 0);
      }
    }
    Object.defineProperty(window, 'Image', { configurable: true, writable: true, value: FakeImage });

    try {
      const dataUrl = await service.generateLinkedInImage(stats);

      expect(dataUrl).toBe('data:image/png;base64,rendered');
      expect(context.fillText).toHaveBeenCalledWith(
        jasmine.stringMatching(/cumplido/),
        jasmine.any(Number),
        jasmine.any(Number)
      );
      expect(context.fillText).toHaveBeenCalledWith(
        jasmine.stringMatching(/Progreso de Candela/),
        jasmine.any(Number),
        jasmine.any(Number)
      );
      expect(context.stroke).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'Image', { configurable: true, writable: true, value: originalImage });
    }
  });
});
