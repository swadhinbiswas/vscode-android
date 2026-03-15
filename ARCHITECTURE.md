# Architecture Documentation

## System Overview

VSCode Android follows a hybrid architecture combining Tauri's Rust backend with a React frontend, optimized for Android mobile devices.

## High-Level Architecture

```mermaid
graph TB
    subgraph User["User Interface"]
        A[Touch Input]
        B[Keyboard Input]
    end
    
    subgraph Frontend["React Frontend (WebView)"]
        C[Monaco Editor]
        D[UI Components]
        E[State Management]
        F[Command Palette]
    end
    
    subgraph Bridge["Tauri Bridge"]
        G[IPC Layer]
        H[Command Handler]
    end
    
    subgraph Backend["Rust Backend"]
        I[API Client]
        J[Sync Engine]
        K[File System]
        L[WebSocket Manager]
    end
    
    subgraph External["External Services"]
        M[GitHub API]
        N[Codespaces API]
        O[Codespace WebSocket]
    end
    
    User --> A
    User --> B
    A --> D
    B --> C
    C --> E
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    H --> L
    I --> M
    I --> N
    L --> O
    J --> I
    K --> E
```

## Component Architecture

### Frontend Components

```mermaid
graph LR
    subgraph App["App.tsx"]
        A1[SplashScreen]
        A2[AuthScreen]
        A3[CodespaceSelector]
        A4[MainLayout]
    end
    
    subgraph Main["MainLayout"]
        B1[ActivityBar]
        B2[SideBar]
        B3[EditorArea]
        B4[StatusBar]
        B5[TerminalPanel]
    end
    
    subgraph Editor["EditorArea"]
        C1[TabBar]
        C2[MonacoEditor]
        C3[EditorOptions]
    end
    
    App --> Main
    Main --> Editor
```

### State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Splash
    Splash --> Auth: App Load
    Auth --> CodespaceSelect: Login Success
    CodespaceSelect --> Editor: Codespace Selected
    Editor --> Syncing: File Changed
    Syncing --> Editor: Sync Complete
    Editor --> Offline: Network Lost
    Offline --> Syncing: Network Restored
    Editor --> [*]: App Close
```

## Data Flow

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant T as Tauri Backend
    participant G as GitHub
    participant S as Secure Store
    
    U->>F: Click "Sign in with GitHub"
    F->>T: github_login()
    T->>G: OAuth Authorization Request
    G->>U: Login Page
    U->>G: Enter Credentials
    G->>T: OAuth Callback (code)
    T->>G: Exchange Code for Token
    G->>T: Access Token
    T->>S: Store Token Securely
    T->>G: Get User Info
    G->>T: User Data
    T->>F: Auth Success
    F->>U: Show Editor
```

### File Sync Flow

```mermaid
sequenceDiagram
    participant U as User
    participant E as Monaco Editor
    participant S as Sync Engine
    participant Q as Sync Queue
    participant C as Codespace
    
    U->>E: Type Character
    E->>S: onChange Event
    S->>Q: Queue Change (debounced)
    Note over Q: Wait 300ms
    
    Q->>S: Flush Queue
    S->>S: Generate Diff
    S->>C: WebSocket Push
    C->>S: Acknowledge
    S->>E: Update Sync Status
    
    par Background Sync
        S->>C: Poll for Changes
        C->>S: Remote Changes
        S->>E: Apply Changes
    end
```

## Sync System Architecture

```mermaid
graph TB
    subgraph Local["Local State"]
        L1[File Buffer]
        L2[Checksum Map]
        L3[Pending Queue]
    end
    
    subgraph Engine["Sync Engine"]
        E1[Diff Generator]
        E2[Conflict Detector]
        E3[Queue Processor]
        E4[Network Monitor]
    end
    
    subgraph Remote["Remote State"]
        R1[Codespace Files]
        R2[Remote Checksums]
        R3[Git History]
    end
    
    L1 --> E1
    L2 --> E2
    L3 --> E3
    E4 --> E3
    E1 --> E2
    E2 --> E3
    E3 --> R1
    R2 --> E2
    R3 --> E2
```

## Conflict Resolution

```mermaid
flowchart TD
    A[File Changed] --> B{Both Changed?}
    B -->|No| C[Auto-Merge]
    B -->|Yes| D{Has Base?}
    D -->|No| E[Timestamp Compare]
    D -->|Yes| F[3-Way Merge]
    F --> G{Overlap?}
    G -->|No| H[Merge Success]
    G -->|Yes| I[Mark Conflicts]
    E --> J[Last Write Wins]
    C --> K[Apply Change]
    H --> K
    I --> L[User Resolution]
    J --> K
    L --> K
```

## Mobile Optimizations

### Touch Target Hierarchy

```mermaid
graph LR
    subgraph Sizes["Touch Target Sizes"]
        A1[Minimum: 44x44dp]
        A2[Recommended: 48x48dp]
        A3[Comfortable: 56x56dp]
    end
    
    subgraph Components["Component Mapping"]
        B1[Icons: 48dp]
        B2[Buttons: 48dp height]
        B3[Tabs: 56dp height]
        B4[Menu Items: 48dp height]
    end
    
    Sizes --> Components
```

### Responsive Breakpoints

```mermaid
graph LR
    subgraph Breakpoints["Screen Sizes"]
        A1[Phone: <600px]
        A2[Tablet: 600-1024px]
        A3[Desktop: >1024px]
    end
    
    subgraph Layouts["Layout Adaptations"]
        B1[Phone: Overlay Sidebar]
        B2[Tablet: Split View]
        B3[Desktop: Full Layout]
    end
    
    Breakpoints --> Layouts
```

## Security Architecture

```mermaid
graph TB
    subgraph Secure["Secure Storage"]
        S1[Tauri Store (Encrypted)]
        S2[Android Keystore]
    end
    
    subgraph Auth["Authentication"]
        A1[OAuth 2.0 Flow]
        A2[State Verification]
        A3[Token Refresh]
    end
    
    subgraph Network["Network Security"]
        N1[HTTPS Only]
        N2[CSP Headers]
        N3[WebSocket TLS]
    end
    
    Auth --> Secure
    Network --> Secure
```

## Plugin Architecture (Future)

```mermaid
graph TB
    subgraph Host["App Host"]
        H1[Plugin Manager]
        H2[Extension API]
        H3[Sandbox Runtime]
    end
    
    subgraph Plugins["Extensions"]
        P1[Language Support]
        P2[Themes]
        P3[Snippets]
        P4[Debuggers]
    end
    
    H1 --> H2
    H2 --> H3
    H3 --> P1
    H3 --> P2
    H3 --> P3
    H3 --> P4
```

## Performance Considerations

### Memory Management

```mermaid
graph LR
    subgraph Memory["Memory Strategy"]
        M1[Lazy Loading]
        M2[Virtual Scrolling]
        M3[Editor Chunking]
        M4[Cache Eviction]
    end
    
    M1 --> M2
    M2 --> M3
    M3 --> M4
```

### Network Optimization

```mermaid
graph TB
    subgraph Network["Network Strategy"]
        N1[Request Batching]
        N2[Response Caching]
        N3[Delta Sync]
        N4[Compression]
    end
    
    N1 --> N2
    N2 --> N3
    N3 --> N4
```

## Testing Architecture

```mermaid
graph TB
    subgraph Tests["Test Pyramid"]
        T1[Unit Tests - Vitest]
        T2[Integration Tests]
        T3[E2E Tests - Playwright]
    end
    
    subgraph Coverage["Coverage Targets"]
        C1[Components: 80%]
        C2[Hooks: 90%]
        C3[Utils: 95%]
        C4[E2E: Critical Paths]
    end
    
    Tests --> Coverage
```

## Deployment Pipeline

```mermaid
graph LR
    subgraph CI["CI/CD Pipeline"]
        A1[Code Push]
        A2[Lint & Type Check]
        A3[Unit Tests]
        A4[Build APK/AAB]
        A5[E2E Tests]
        A6[Release]
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> A6
```

## Key Design Decisions

1. **Local-First Architecture**: All editing happens locally for 60fps responsiveness
2. **Debounced Sync**: 300ms debounce balances responsiveness with network efficiency
3. **Monaco Editor**: Same editor as VS Code for familiarity and features
4. **Tauri over React Native**: Better performance, smaller bundle, Rust backend
5. **Jotai over Redux**: Simpler API, better TypeScript support, atomic updates
6. **WebSocket for Real-time**: Lower latency than polling for sync updates

## Future Architecture

### Extension System

- WebAssembly-based plugin sandbox
- Capability-based security model


### Plugin Architecture

- Lazy loading for performance
- Isolated execution context

