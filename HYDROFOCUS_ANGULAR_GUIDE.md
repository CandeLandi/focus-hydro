# HydroFocus - Guía de Implementación Angular 19

## 📋 Descripción del Proyecto

**HydroFocus** es una aplicación de productividad basada en la técnica Pomodoro con un enfoque único en la hidratación. Utiliza una animación de botella de agua que se vacía progresivamente durante las sesiones de enfoque, recordando al usuario mantenerse hidratado mientras trabaja.

**Características principales:**
- Temporizador Pomodoro personalizable (25min enfoque / 5min descanso)
- Visualización de botella de agua que se vacía con el tiempo
- Gestión de tareas diarias con historial
- Estadísticas y análisis de productividad
- Sistema de logros y gamificación
- Reproductor de música ambiental
- Autenticación opcional con Google (para sincronizar progreso)

---

## 🏗️ Arquitectura y Estructura de Carpetas

\`\`\`
src/
├── app/
│   ├── core/                          # Servicios singleton y configuración
│   │   ├── services/
│   │   │   ├── timer.service.ts       # Lógica del temporizador Pomodoro
│   │   │   ├── storage.service.ts     # Persistencia (localStorage + API)
│   │   │   ├── auth.service.ts        # Autenticación con Google
│   │   │   └── music.service.ts       # Control de música ambiental
│   │   ├── guards/
│   │   │   └── auth.guard.ts          # Protección de rutas (opcional)
│   │   └── interceptors/
│   │       └── auth.interceptor.ts    # Agregar token a requests
│   │
│   ├── shared/                        # Componentes y utilidades compartidas
│   │   ├── components/
│   │   │   ├── header/                # Header con logo y navegación
│   │   │   └── auth-button/           # Botón de login/logout
│   │   ├── models/
│   │   │   ├── task.model.ts
│   │   │   ├── session.model.ts
│   │   │   └── settings.model.ts
│   │   └── utils/
│   │       └── date.utils.ts
│   │
│   ├── pages/                         # Páginas principales (lazy loading)
│   │   └── home/
│   │       ├── home.component.ts      # Cascarón principal con router-outlet
│   │       ├── home.component.html
│   │       └── home.routes.ts         # Rutas hijas
│   │
│   ├── features/                      # Módulos por funcionalidad
│   │   ├── timer/                     # Vista Temporizador
│   │   │   ├── timer.component.ts
│   │   │   ├── components/
│   │   │   │   ├── water-bottle/      # Botella animada + timer
│   │   │   │   ├── quick-stats/       # Estadísticas rápidas (3 cards)
│   │   │   │   ├── task-list/         # Lista de tareas del día
│   │   │   │   └── music-player/      # Reproductor de música
│   │   │   └── timer.routes.ts
│   │   │
│   │   ├── stats/                     # Vista Estadísticas
│   │   │   ├── stats.component.ts
│   │   │   ├── components/
│   │   │   │   ├── progress-overview/ # Resumen de progreso
│   │   │   │   ├── analytics-charts/  # Gráficos de análisis
│   │   │   │   ├── achievements/      # Logros desbloqueados
│   │   │   │   └── share-card/        # Tarjeta para compartir en LinkedIn
│   │   │   └── stats.routes.ts
│   │   │
│   │   └── settings/                  # Vista Ajustes
│   │       ├── settings.component.ts
│   │       ├── components/
│   │       │   ├── timer-config/      # Configuración de duraciones
│   │       │   └── preferences/       # Preferencias (música, notificaciones)
│   │       └── settings.routes.ts
│   │
│   ├── app.component.ts               # Componente raíz
│   ├── app.component.html             # <router-outlet> principal
│   ├── app.config.ts                  # Configuración de la app
│   └── app.routes.ts                  # Rutas principales
│
├── assets/
│   ├── images/                        # Imágenes de música, etc.
│   └── sounds/                        # Sonidos de notificación
│
└── styles/
    └── styles.css                     # Tailwind + variables globales
\`\`\`

---

## 🔀 Estructura de Routing

### app.routes.ts (Rutas principales)
\`\`\`typescript
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    children: [
      { path: '', redirectTo: 'temporizador', pathMatch: 'full' },
      {
        path: 'temporizador',
        loadComponent: () => import('./features/timer/timer.component').then(m => m.TimerComponent)
      },
      {
        path: 'estadisticas',
        loadComponent: () => import('./features/stats/stats.component').then(m => m.StatsComponent)
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  }
];
\`\`\`

### app.component.html (Raíz)
\`\`\`html
<router-outlet />
\`\`\`

### home.component.html (Cascarón)
\`\`\`html
<div class="min-h-screen bg-slate-950 text-slate-100">
   Header con navegación 
  <app-header />
  
   Contenido principal 
  <main class="container mx-auto px-4 py-6">
    <router-outlet />
  </main>
</div>
\`\`\`

---

## 📦 Componentes por Vista

### 1️⃣ Vista: Temporizador (`/temporizador`)

**Layout:** Grid de 2 columnas + fila inferior para música

\`\`\`
┌─────────────────────────────────────────────────┐
│  Header (Logo + Navegación + Auth)              │
├──────────────────────┬──────────────────────────┤
│                      │  ┌────────────────────┐  │
│                      │  │  Quick Stats       │  │
│   Water Bottle       │  │  (3 cards)         │  │
│   + Timer            │  └────────────────────┘  │
│   (Botella animada)  │  ┌────────────────────┐  │
│                      │  │  Task List         │  │
│                      │  │  (Tareas del día)  │  │
│                      │  └────────────────────┘  │
├──────────────────────┴──────────────────────────┤
│  Music Player (Reproductor ambiental)           │
└─────────────────────────────────────────────────┘
\`\`\`

#### Componentes:

**`timer.component.ts`** (Contenedor)
- Responsabilidad: Layout grid, coordinar componentes hijos
- Template: Grid de 2 columnas con `grid-cols-2 gap-6`

**`water-bottle.component.ts`**
- Responsabilidad: Animación SVG de botella que se vacía
- Inputs: `@Input() waterLevel: number` (0-100)
- Outputs: Ninguno (solo visual)
- Lógica: Calcular altura del agua, posicionar burbujas dinámicamente
- Tecnología: SVG con gradientes y animaciones CSS

**`quick-stats.component.ts`**
- Responsabilidad: Mostrar 3 métricas rápidas (Completadas Hoy, Enfoque Total, Progreso)
- Inputs: `@Input() stats: QuickStats`
- Layout: 3 cards horizontales con PrimeNG Card
- Actualización: Signals reactivos desde TimerService

**`task-list.component.ts`**
- Responsabilidad: CRUD de tareas del día
- Features:
  - Agregar nueva tarea (input + botón)
  - Marcar como completada (checkbox)
  - Eliminar tarea (botón)
  - Mostrar progreso (X de Y completadas)
- Componentes PrimeNG: Checkbox, Button, InputText
- Scroll: `max-h-[600px] overflow-y-auto` si hay muchas tareas

**`music-player.component.ts`**
- Responsabilidad: Reproducir música ambiental
- Features:
  - 4 canales predefinidos (Lo-fi, Lluvia, Naturaleza, Café)
  - Play/Pause
  - Control de volumen (slider)
- Componentes PrimeNG: Button, Slider
- Audio: `<audio>` nativo con URLs de música

---

### 2️⃣ Vista: Estadísticas (`/estadisticas`)

**Layout:** Grid flexible con secciones de análisis

\`\`\`
┌─────────────────────────────────────────────────┐
│  Header (Logo + Navegación + Auth)              │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │  Progress Overview                        │  │
│  │  (Resumen semanal/mensual)                │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Analytics Charts                         │  │
│  │  (Gráficos de sesiones, tiempo, etc.)     │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Achievements                             │  │
│  │  (Logros desbloqueados + progreso)        │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Share Card                               │  │
│  │  (Compartir en LinkedIn)                  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
\`\`\`

#### Componentes:

**`stats.component.ts`** (Contenedor)
- Responsabilidad: Layout vertical, cargar datos de estadísticas
- OnInit: Llamar a StorageService para obtener historial

**`progress-overview.component.ts`**
- Responsabilidad: Mostrar resumen de progreso (días perfectos, racha actual, etc.)
- Inputs: `@Input() progressData: ProgressData`
- Layout: Cards con métricas clave
- Componentes PrimeNG: Card, ProgressBar

**`analytics-charts.component.ts`**
- Responsabilidad: Gráficos de análisis (sesiones por día, tiempo total, etc.)
- Inputs: `@Input() sessionsHistory: Session[]`
- Tecnología: PrimeNG Chart (Chart.js wrapper)
- Tipos de gráficos:
  - Línea: Sesiones por día (últimos 7 días)
  - Barra: Tiempo de enfoque por día
  - Dona: Distribución de tareas completadas vs pendientes

**`achievements.component.ts`**
- Responsabilidad: Mostrar logros desbloqueados y progreso hacia nuevos
- Inputs: `@Input() achievements: Achievement[]`
- Layout: Grid de tarjetas con iconos y progreso
- Componentes PrimeNG: Card, ProgressBar, Badge

**`share-card.component.ts`**
- Responsabilidad: Generar imagen para compartir en LinkedIn
- Features:
  - Botón "Compartir en LinkedIn"
  - Generar imagen con estadísticas (html2canvas)
  - Descargar imagen o copiar texto
- Componentes PrimeNG: Button, Dialog

---

### 3️⃣ Vista: Ajustes (`/ajustes`)

**Layout:** Formulario vertical con secciones

\`\`\`
┌─────────────────────────────────────────────────┐
│  Header (Logo + Navegación + Auth)              │
├─────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────┐  │
│  │  Timer Configuration                      │  │
│  │  - Duración de enfoque (25 min)           │  │
│  │  - Duración de descanso (5 min)           │  │
│  │  - Descanso largo (15 min)                │  │
│  │  - Sesiones hasta descanso largo (4)      │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Preferences                              │  │
│  │  - Música por defecto (dropdown)          │  │
│  │  - Volumen inicial (slider)               │  │
│  │  - Notificaciones (toggle)                │  │
│  │  - Sonido de alerta (toggle)              │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  [Guardar Cambios] [Restaurar Defaults]  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
\`\`\`

#### Componentes:

**`settings.component.ts`** (Contenedor)
- Responsabilidad: Layout vertical, manejar guardado de configuración
- Form: Reactive Forms con FormGroup
- OnInit: Cargar configuración actual desde StorageService

**`timer-config.component.ts`**
- Responsabilidad: Configurar duraciones del temporizador
- Inputs: `@Input() config: TimerConfig`
- Outputs: `@Output() configChange: EventEmitter<TimerConfig>`
- Componentes PrimeNG: InputNumber, Slider
- Validación: Min/Max para cada campo

**`preferences.component.ts`**
- Responsabilidad: Configurar preferencias de usuario
- Features:
  - Dropdown para seleccionar música por defecto
  - Slider para volumen inicial
  - Toggles para notificaciones y sonidos
- Componentes PrimeNG: Dropdown, Slider, InputSwitch
- Inputs: `@Input() preferences: UserPreferences`
- Outputs: `@Output() preferencesChange: EventEmitter<UserPreferences>`

---

## 🎨 Diseño y Estilos

### Paleta de Colores (Tailwind CSS)
\`\`\`css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Colores principales */
    --color-primary: 6 182 212;      /* cyan-500 */
    --color-secondary: 14 165 233;   /* sky-500 */
    --color-accent: 34 211 238;      /* cyan-400 */
    
    /* Backgrounds */
    --color-bg-dark: 2 6 23;         /* slate-950 */
    --color-bg-card: 15 23 42;       /* slate-900 */
    
    /* Text */
    --color-text-primary: 248 250 252;   /* slate-50 */
    --color-text-secondary: 148 163 184; /* slate-400 */
  }
}
\`\`\`

### Componentes PrimeNG
- **Tema**: Lara Dark (tema oscuro por defecto)
- **Configuración**: `primeng/resources/themes/lara-dark-cyan/theme.css`
- **Componentes usados**:
  - Button, Card, InputText, InputNumber
  - Checkbox, Dropdown, Slider, InputSwitch
  - Chart, ProgressBar, Badge, Dialog

---

## 🔧 Servicios Core

### TimerService
\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class TimerService {
  // Signals (Angular 19)
  timeRemaining = signal<number>(1500); // 25 min en segundos
  isRunning = signal<boolean>(false);
  currentMode = signal<'focus' | 'break'>('focus');
  sessionCount = signal<number>(0);
  waterLevel = computed(() => {
    const total = this.currentMode() === 'focus' ? 1500 : 300;
    return (this.timeRemaining() / total) * 100;
  });

  start(): void { /* Iniciar timer */ }
  pause(): void { /* Pausar timer */ }
  reset(): void { /* Resetear timer */ }
  skip(): void { /* Saltar a siguiente sesión */ }
}
\`\`\`

### StorageService
\`\`\`typescript
@Injectable({ providedIn: 'root' })
export class StorageService {
  private apiUrl = environment.apiUrl;

  // Tareas
  getTodayTasks(): Observable<Task[]> { /* GET /tasks */ }
  saveTask(task: Task): Observable<Task> { /* POST /tasks */ }
  updateTask(id: string, updates: Partial<Task>): Observable<Task> { /* PATCH /tasks/:id */ }
  deleteTask(id: string): Observable<void> { /* DELETE /tasks/:id */ }

  // Sesiones
  saveSession(session: Session): Observable<Session> { /* POST /sessions */ }
  getSessionsHistory(): Observable<Session[]> { /* GET /sessions */ }
  getStats(): Observable<Stats> { /* GET /sessions/stats */ }

  // Configuración
  getSettings(): Observable<Settings> { /* GET /settings */ }
  saveSettings(settings: Settings): Observable<Settings> { /* PATCH /settings */ }
}
\`\`\`

---

## 📝 Modelos de Datos

\`\`\`typescript
// task.model.ts
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date: Date;
  userId?: string;
}

// session.model.ts
export interface Session {
  id: string;
  type: 'focus' | 'break';
  duration: number; // segundos
  completedAt: Date;
  userId?: string;
}

// settings.model.ts
export interface Settings {
  focusDuration: number;      // 25 min
  breakDuration: number;       // 5 min
  longBreakDuration: number;   // 15 min
  sessionsUntilLongBreak: number; // 4
  defaultMusic: string;
  volume: number;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

// stats.model.ts
export interface Stats {
  todayCompletedTasks: number;
  totalFocusTime: number; // horas
  weeklyProgress: number; // porcentaje
}
\`\`\`

---

## 🚀 Plan de Implementación (Orden Recomendado)

### Fase 1: Cascarón y Estructura
1. ✅ Crear estructura de carpetas
2. ✅ Configurar routing (app.routes.ts + home.routes.ts)
3. ✅ Crear HomeComponent (cascarón con header + router-outlet)
4. ✅ Crear HeaderComponent (logo + navegación)
5. ✅ Crear componentes vacíos de las 3 vistas principales

### Fase 2: Vista Temporizador (MVP)
6. ✅ Implementar TimerService con signals
7. ✅ Crear WaterBottleComponent (SVG estático primero)
8. ✅ Agregar lógica de animación de agua
9. ✅ Crear QuickStatsComponent
10. ✅ Crear TaskListComponent (CRUD básico)
11. ✅ Integrar StorageService (localStorage primero)

### Fase 3: Funcionalidades Adicionales
12. ✅ Crear MusicPlayerComponent
13. ✅ Implementar MusicService
14. ✅ Crear SettingsComponent + subcomponentes
15. ✅ Conectar settings con TimerService

### Fase 4: Estadísticas y Gamificación
16. ✅ Crear StatsComponent + subcomponentes
17. ✅ Implementar gráficos con PrimeNG Chart
18. ✅ Crear sistema de achievements
19. ✅ Implementar ShareCardComponent

### Fase 5: Backend y Autenticación
20. ✅ Crear AuthService
21. ✅ Implementar login con Google
22. ✅ Conectar StorageService con API NestJS
23. ✅ Agregar interceptor para tokens

---

## 💡 Buenas Prácticas

### Código Limpio
- ✅ **Standalone Components**: Todos los componentes son standalone (Angular 19)
- ✅ **Signals**: Usar signals para estado reactivo en lugar de RxJS cuando sea posible
- ✅ **Computed**: Derivar valores con `computed()` (ej: waterLevel)
- ✅ **OnPush**: Change detection strategy OnPush en todos los componentes
- ✅ **Lazy Loading**: Cargar vistas con `loadComponent()`
- ✅ **Typed Forms**: Usar Reactive Forms con tipado estricto

### Estructura
- ✅ **Feature Modules**: Agrupar por funcionalidad (timer, stats, settings)
- ✅ **Smart/Dumb Components**: Contenedores (smart) vs presentacionales (dumb)
- ✅ **Services Singleton**: Todos los servicios en `core/services` con `providedIn: 'root'`
- ✅ **Modelos Compartidos**: Interfaces en `shared/models`

### Estilos
- ✅ **Tailwind CSS**: Usar utility classes para layouts y estilos
- ✅ **PrimeNG**: Componentes reutilizables (no reinventar la rueda)
- ✅ **Responsive**: Mobile-first con breakpoints de Tailwind
- ✅ **Dark Mode**: Tema oscuro por defecto (bg-slate-950)

### Testing (Opcional pero recomendado)
- ✅ **Unit Tests**: Servicios y lógica de negocio
- ✅ **Component Tests**: Componentes presentacionales
- ✅ **E2E Tests**: Flujos críticos (crear tarea, completar sesión)

---

## 🎯 Próximos Pasos

1. **Crear proyecto Angular 19**:
   \`\`\`bash
   ng new hydrofocus --standalone --routing --style=css
   cd hydrofocus
   npm install primeng primeicons
   npm install -D tailwindcss postcss autoprefixer
   npx tailwindcss init
   \`\`\`

2. **Configurar Tailwind** en `tailwind.config.js`:
   \`\`\`js
   module.exports = {
     content: ["./src/**/*.{html,ts}"],
     theme: { extend: {} },
     plugins: [],
   }
   \`\`\`

3. **Importar PrimeNG** en `app.config.ts`:
   \`\`\`typescript
   import { provideAnimations } from '@angular/platform-browser/animations';
   
   export const appConfig: ApplicationConfig = {
     providers: [
       provideRouter(routes),
       provideAnimations(),
       provideHttpClient()
     ]
   };
   \`\`\`

4. **Seguir el plan de implementación** fase por fase

---

## 📚 Recursos

- [Angular 19 Docs](https://angular.dev)
- [PrimeNG Components](https://primeng.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Signals Guide](https://angular.dev/guide/signals)
- [Standalone Components](https://angular.dev/guide/components/importing)

---

**¡Listo para empezar a construir el cascarón! 🚀**
