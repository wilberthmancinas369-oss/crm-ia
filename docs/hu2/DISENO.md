# Multi-tenant Groups and Roles Model - HU-2

## 1. Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    company ||--o{ group : "owns"
    company ||--o{ profile : "belongs to"
    company ||--o{ role : "defines"
    group ||--o{ user_group_role : "contains"
    profile ||--o{ user_group_role : "assigned to"
    role ||--o{ user_group_role : "defines permissions"

    company {
        uuid id PK
        string name
        string created_at
    }

    profile {
        uuid id PK "References auth.users"
        uuid company_id FK
        string full_name
        string email
        string created_at
    }

    role {
        uuid id PK
        uuid company_id FK
        string name "Agente, Jefe de Area, Administrador"
        integer level "Inheritance level (0: Agente, 1: Jefe, 2: Admin)"
        string created_at
    }

    group {
        uuid id PK
        uuid company_id FK
        string name
        string description
        string created_at
    }

    user_group_role {
        uuid user_id PK, FK "References profile.id"
        uuid group_id PK, FK "References group.id"
        uuid role_id PK, FK "References role.id"
        uuid company_id FK "For RLS efficiency"
        string assigned_at
    }
```

## 2. Decisiones de Diseño del Modelo de Datos

- **Multi-tenancy (Multitenencia)**: Todas las tablas contienen la columna `company_id`. Esto permite implementar políticas de Seguridad a Nivel de Fila (RLS) simples y eficientes.
- **Integración de Autenticación**: Estoy utilizando una tabla de `profiles` (perfiles) que se vincula con `auth.users` de Supabase. Este es el patrón estándar recomendado por Supabase.
- **Herencia de Roles**: En lugar de utilizar una tabla compleja de autorreferencia, estoy usando un entero de `level` (nivel).
    - `Agente`: Nivel 0
    - `Jefe de Área`: Nivel 1 (hereda del Nivel 0)
    - `Administrador`: Nivel 2 (hereda del Nivel 1)
- **Relación Usuario-Grupo-Rol**: Un usuario puede pertenecer a múltiples grupos y, en cada grupo, tiene asignado un rol específico.

## 3. DDL de SQL Detallado y Políticas RLS

El siguiente script incluye las tablas, restricciones, políticas RLS e índices.
