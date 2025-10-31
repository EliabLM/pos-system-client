# Database Remote Access Guide

Guía completa para acceder remotamente a la base de datos PostgreSQL de la instancia OCI desde herramientas como DBeaver o pgAdmin.

## Tabla de Contenidos

- [Opción 1: SSH Tunneling (Recomendada)](#opción-1-ssh-tunneling-recomendada---más-segura)
- [Opción 2: Abrir Puerto en OCI](#opción-2-abrir-puerto-en-oci-menos-segura)
- [Opción 3: Túnel SSH desde Línea de Comandos](#opción-3-túnel-ssh-desde-línea-de-comandos-flexible)
- [Verificar Configuración de PostgreSQL](#verificar-configuración-actual-de-postgresql)
- [Recomendaciones de Seguridad](#recomendaciones-de-seguridad)
- [Troubleshooting](#troubleshooting)
- [Resumen de Opciones](#resumen-de-opciones)

---

## Contexto

En desarrollo local, la base de datos está en Supabase (remota). En la instancia de producción en OCI, la base de datos PostgreSQL está instalada localmente en la misma instancia (`localhost`).

Para acceder a esta base de datos desde tu máquina local usando herramientas gráficas, necesitas establecer una conexión segura.

---

## Opción 1: SSH Tunneling (Recomendada - Más Segura)

Esta es la opción **MÁS SEGURA** porque no expones el puerto de PostgreSQL directamente a Internet. Todo el tráfico pasa por el túnel SSH encriptado.

### Configuración en DBeaver

#### 1. Crear nueva conexión PostgreSQL

1. Click en **"Nueva conexión"** (ícono de enchufe con +)
2. Selecciona **PostgreSQL**
3. En la pestaña **"Main"**:
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: nombre de tu base de datos
   - **Username**: tu usuario de PostgreSQL
   - **Password**: contraseña de PostgreSQL

#### 2. Configurar SSH Tunnel

1. Ve a la pestaña **"SSH"**
2. Marca ✅ **"Use SSH Tunnel"**
3. Configuración SSH:
   - **Host/IP**: IP pública de tu instancia OCI
   - **Port**: `22` (puerto SSH)
   - **Username**: tu usuario SSH (ej: `ubuntu`, `opc`, `oracle`, etc.)
   - **Authentication Method**:
     - **🔑 Public Key** (recomendado):
       - Click en "Browse" y selecciona tu archivo `.pem` o clave privada
       - Ejemplo: `~/.ssh/oci-key.pem`
     - **🔒 Password**: si usas autenticación por contraseña SSH

4. **Test Tunnel Configuration**: Click para verificar que la conexión SSH funciona

5. Click en **"Test Connection"** para verificar todo

6. **Finish** para guardar

#### Diagrama de conexión:

```
Tu PC → SSH (puerto 22) → Servidor OCI → PostgreSQL (localhost:5432)
       [Túnel encriptado]
```

### Configuración en pgAdmin

#### 1. Crear nuevo servidor

1. Click derecho en **"Servers"** → **"Create"** → **"Server..."**

#### 2. Pestaña "General"

- **Name**: `OCI POS System` (o el nombre que prefieras)
- **Server group**: Servers
- **Comments**: Base de datos de producción en OCI

#### 3. Pestaña "Connection"

- **Host name/address**: `localhost` o `127.0.0.1`
- **Port**: `5432`
- **Maintenance database**: nombre de tu base de datos (ej: `pos_system`)
- **Username**: usuario de PostgreSQL (ej: `postgres`)
- **Password**: contraseña de PostgreSQL
- ✅ **Save password**: opcional

#### 4. Pestaña "SSH Tunnel"

- ✅ **Use SSH tunneling**: Activar
- **Tunnel host**: IP pública de tu instancia OCI
- **Tunnel port**: `22`
- **Username**: usuario SSH
- **Authentication**:
   - **Identity file**: selecciona tu archivo `.pem`
   - Ejemplo: `C:\Users\tu-usuario\.ssh\oci-key.pem`
- **Password**: contraseña de la clave privada (si la tiene)

#### 5. Guardar y conectar

- Click en **"Save"**
- El servidor aparecerá en el panel izquierdo
- Expandir para ver las bases de datos

### Usando Terminal (Manual)

Puedes crear el túnel SSH manualmente desde tu terminal y luego conectar normalmente:

#### Windows (PowerShell o CMD):

```bash
ssh -L 5432:localhost:5432 usuario@ip-publica-oci -i ruta\a\tu\clave.pem
```

#### Linux/Mac:

```bash
ssh -L 5432:localhost:5432 usuario@ip-publica-oci -i ~/.ssh/oci-key.pem
```

#### Ejemplo completo:

```bash
ssh -L 5432:localhost:5432 ubuntu@123.456.789.10 -i ~/.ssh/oci-key.pem
```

**Mantén esta terminal abierta** mientras trabajas con la base de datos.

Luego conecta DBeaver/pgAdmin a:
- Host: `localhost`
- Port: `5432`
- (Sin configurar SSH Tunnel en la herramienta)

---

## Opción 2: Abrir Puerto en OCI (Menos Segura)

⚠️ **ADVERTENCIA**: Solo usar para desarrollo/testing. NO recomendado para producción.

Si decides exponer PostgreSQL directamente a Internet:

### Paso 1: Configurar PostgreSQL para aceptar conexiones remotas

Conecta a tu servidor OCI:

```bash
ssh usuario@ip-publica-oci -i tu-clave.pem
```

#### A. Editar `postgresql.conf`

```bash
# Encontrar el archivo de configuración
sudo find /etc/postgresql -name postgresql.conf

# O ubicación típica en Ubuntu/Debian
sudo nano /etc/postgresql/14/main/postgresql.conf

# En RHEL/CentOS puede estar en:
sudo nano /var/lib/pgsql/data/postgresql.conf
```

Buscar y cambiar:

```conf
# ANTES:
listen_addresses = 'localhost'

# DESPUÉS:
listen_addresses = '*'
```

Guardar con `Ctrl+O`, salir con `Ctrl+X`

#### B. Editar `pg_hba.conf`

```bash
# Ubuntu/Debian
sudo nano /etc/postgresql/14/main/pg_hba.conf

# RHEL/CentOS
sudo nano /var/lib/pgsql/data/pg_hba.conf
```

Agregar al final del archivo:

```conf
# Permitir conexiones desde cualquier IP (solo desarrollo)
host    all             all             0.0.0.0/0               md5

# O permitir solo tu IP específica (más seguro)
# Reemplaza 123.456.789.100 con tu IP pública
host    all             all             123.456.789.100/32      md5
```

Para encontrar tu IP pública:
- Visita: https://www.whatismyip.com/
- O ejecuta: `curl ifconfig.me`

Guardar y salir.

#### C. Reiniciar PostgreSQL

```bash
# Ubuntu/Debian
sudo systemctl restart postgresql

# RHEL/CentOS
sudo systemctl restart postgresql-14

# Verificar que está corriendo
sudo systemctl status postgresql
```

### Paso 2: Configurar Firewall de OCI

#### A. En OCI Console (Web):

1. Inicia sesión en https://cloud.oracle.com/
2. Ve a **Networking** → **Virtual Cloud Networks**
3. Selecciona tu VCN (Virtual Cloud Network)
4. Click en la **Default Security List** o la Security List que uses
5. Click en **"Add Ingress Rules"**
6. Configurar nueva regla:
   - **Stateless**: No
   - **Source Type**: CIDR
   - **Source CIDR**:
     - `0.0.0.0/0` (cualquier IP - NO recomendado)
     - `TU_IP_PUBLICA/32` (solo tu IP - recomendado)
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `5432`
   - **Description**: `PostgreSQL Remote Access`
7. Click **"Add Ingress Rules"**

#### B. En el servidor (Firewall del SO):

##### Ubuntu (ufw):

```bash
# Ver estado del firewall
sudo ufw status

# Permitir puerto PostgreSQL
sudo ufw allow 5432/tcp

# O solo desde tu IP
sudo ufw allow from TU_IP_PUBLICA to any port 5432

# Verificar
sudo ufw status numbered
```

##### RHEL/CentOS (firewalld):

```bash
# Ver zonas activas
sudo firewall-cmd --get-active-zones

# Agregar regla permanente
sudo firewall-cmd --permanent --add-port=5432/tcp

# O solo desde tu IP
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="TU_IP_PUBLICA/32" port protocol="tcp" port="5432" accept'

# Recargar firewall
sudo firewall-cmd --reload

# Verificar
sudo firewall-cmd --list-all
```

##### iptables (alternativa):

```bash
# Agregar regla
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

# O solo desde tu IP
sudo iptables -A INPUT -p tcp -s TU_IP_PUBLICA --dport 5432 -j ACCEPT

# Guardar reglas
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# Verificar
sudo iptables -L -n
```

### Paso 3: Conectar desde DBeaver/pgAdmin

Ahora puedes conectar directamente sin SSH Tunnel:

#### DBeaver:

1. Nueva conexión PostgreSQL
2. **Host**: IP pública de tu instancia OCI
3. **Port**: `5432`
4. **Database**: nombre de tu base de datos
5. **Username**: usuario PostgreSQL
6. **Password**: contraseña PostgreSQL
7. **NO** marcar "Use SSH Tunnel"
8. Test Connection

#### pgAdmin:

1. Create Server
2. **Connection Tab**:
   - Host: IP pública OCI
   - Port: 5432
   - Database: tu base de datos
   - Username: usuario
   - Password: contraseña
3. **NO** configurar SSH Tunnel
4. Save

---

## Opción 3: Túnel SSH desde Línea de Comandos (Flexible)

Esta opción te da control total sobre el túnel SSH.

### Crear túnel SSH básico

```bash
# Sintaxis básica
ssh -N -L [puerto_local]:localhost:[puerto_remoto] usuario@host -i clave

# Ejemplo con puerto local 5432
ssh -N -L 5432:localhost:5432 ubuntu@123.456.789.10 -i ~/.ssh/oci-key.pem

# Ejemplo con puerto local diferente (5433)
ssh -N -L 5433:localhost:5432 ubuntu@123.456.789.10 -i ~/.ssh/oci-key.pem
```

**Explicación de flags:**
- `-N`: No ejecutar comandos remotos (solo túnel)
- `-L`: Local port forwarding
- `5432:localhost:5432`: Puerto local:host remoto:puerto remoto
- `-i`: Archivo de clave privada

**La terminal quedará "colgada"** - esto es normal. Mantén la ventana abierta mientras trabajas.

Para cerrar el túnel: `Ctrl+C`

### Túnel en segundo plano

```bash
# Agregar flag -f para correr en background
ssh -f -N -L 5432:localhost:5432 ubuntu@IP_OCI -i ~/.ssh/oci-key.pem

# Para cerrar después, encontrar el proceso
ps aux | grep ssh

# Matar el proceso
kill [PID]
```

### Script para facilitar la conexión

Crea un archivo `tunnel-db.sh`:

```bash
#!/bin/bash

# ============================================
# Script de Túnel SSH para Base de Datos OCI
# ============================================

# Configuración
REMOTE_USER="ubuntu"
REMOTE_HOST="123.456.789.10"
SSH_KEY="~/.ssh/oci-key.pem"
LOCAL_PORT="5433"
REMOTE_PORT="5432"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}🔐 Túnel SSH a Base de Datos OCI${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "📡 Puerto local: ${GREEN}$LOCAL_PORT${NC}"
echo -e "🌐 Host remoto: ${GREEN}$REMOTE_HOST${NC}"
echo -e "🔑 Usuario SSH: ${GREEN}$REMOTE_USER${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}✅ Conectando...${NC}"
echo -e "   Conecta tu herramienta a: ${GREEN}localhost:$LOCAL_PORT${NC}"
echo -e "   Presiona ${RED}Ctrl+C${NC} para cerrar el túnel"
echo ""

# Crear túnel
ssh -N -L $LOCAL_PORT:localhost:$REMOTE_PORT $REMOTE_USER@$REMOTE_HOST -i $SSH_KEY

echo ""
echo -e "${RED}✅ Túnel cerrado${NC}"
```

#### Windows (PowerShell script) - `tunnel-db.ps1`:

```powershell
# ============================================
# Script de Túnel SSH para Base de Datos OCI
# ============================================

# Configuración
$REMOTE_USER = "ubuntu"
$REMOTE_HOST = "123.456.789.10"
$SSH_KEY = "$env:USERPROFILE\.ssh\oci-key.pem"
$LOCAL_PORT = "5433"
$REMOTE_PORT = "5432"

Write-Host "============================================" -ForegroundColor Blue
Write-Host "🔐 Túnel SSH a Base de Datos OCI" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Blue
Write-Host "📡 Puerto local: $LOCAL_PORT" -ForegroundColor Green
Write-Host "🌐 Host remoto: $REMOTE_HOST" -ForegroundColor Green
Write-Host "🔑 Usuario SSH: $REMOTE_USER" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Blue
Write-Host ""
Write-Host "✅ Conectando..." -ForegroundColor Green
Write-Host "   Conecta tu herramienta a: localhost:$LOCAL_PORT" -ForegroundColor Green
Write-Host "   Presiona Ctrl+C para cerrar el túnel" -ForegroundColor Red
Write-Host ""

# Crear túnel
ssh -N -L "${LOCAL_PORT}:localhost:${REMOTE_PORT}" "$REMOTE_USER@$REMOTE_HOST" -i "$SSH_KEY"

Write-Host ""
Write-Host "✅ Túnel cerrado" -ForegroundColor Red
```

#### Hacer ejecutable y usar:

**Linux/Mac:**
```bash
chmod +x tunnel-db.sh
./tunnel-db.sh
```

**Windows PowerShell:**
```powershell
# Permitir ejecución de scripts (primera vez)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Ejecutar
.\tunnel-db.ps1
```

### Conectar DBeaver/pgAdmin al túnel

Con el túnel activo, conecta normalmente:
- **Host**: `localhost`
- **Port**: `5433` (o el puerto local que configuraste)
- **Database**: tu base de datos
- **Username**: usuario PostgreSQL
- **Password**: contraseña PostgreSQL
- **NO usar SSH Tunnel** (ya está activo externamente)

---

## Verificar Configuración Actual de PostgreSQL

### En tu servidor OCI

Conecta al servidor:

```bash
ssh usuario@ip-oci -i clave.pem
```

#### Verificar servicio PostgreSQL:

```bash
# Estado del servicio
sudo systemctl status postgresql

# Ver versión
psql --version

# Ver procesos
ps aux | grep postgres
```

#### Conectar a PostgreSQL y verificar configuración:

```bash
# Conectar como usuario postgres
sudo -u postgres psql

# O especificar base de datos
sudo -u postgres psql -d nombre_base_datos
```

Una vez dentro de psql:

```sql
-- Ver configuración de escucha
SHOW listen_addresses;

-- Ver puerto
SHOW port;

-- Ver conexiones actuales
SELECT * FROM pg_stat_activity;

-- Listar bases de datos
\l

-- Listar usuarios
\du

-- Salir
\q
```

#### Ver puerto de PostgreSQL en uso:

```bash
# Con netstat
sudo netstat -tlnp | grep postgres

# Con ss (más moderno)
sudo ss -tlnp | grep postgres

# Verificar qué está escuchando en puerto 5432
sudo lsof -i :5432
```

Salida esperada:
```
tcp  0  0 0.0.0.0:5432  0.0.0.0:*  LISTEN  1234/postgres
tcp6 0  0 :::5432       :::*       LISTEN  1234/postgres
```

#### Ver archivos de configuración:

```bash
# Encontrar postgresql.conf
sudo find /etc -name postgresql.conf 2>/dev/null

# Encontrar pg_hba.conf
sudo find /etc -name pg_hba.conf 2>/dev/null

# Ver listen_addresses actual
sudo grep "listen_addresses" /etc/postgresql/*/main/postgresql.conf

# Ver reglas de acceso
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

---

## Recomendaciones de Seguridad

### ✅ Opción MÁS SEGURA: SSH Tunneling

**Ventajas:**
- ✅ No expone PostgreSQL a Internet
- ✅ Usa autenticación SSH existente (clave privada)
- ✅ Todo el tráfico está encriptado
- ✅ Fácil de implementar en DBeaver/pgAdmin
- ✅ No requiere configuración adicional de firewall
- ✅ Mismo nivel de seguridad que SSH

**Por qué es segura:**
```
Internet → [BLOQUEADO] → PostgreSQL ❌
Internet → SSH (puerto 22) → Túnel → PostgreSQL ✅
          [Autenticado]    [Encriptado]
```

### ⚠️ Si decides abrir el puerto 5432

#### 1. IP Whitelisting (CRÍTICO)

Solo permite conexiones desde IPs conocidas:

```conf
# En pg_hba.conf
host    all    all    TU_IP_OFICINA/32    md5
host    all    all    TU_IP_CASA/32       md5
```

En Security List de OCI:
- Source CIDR: `TU_IP/32` (no `0.0.0.0/0`)

#### 2. Contraseñas Fuertes

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# Cambiar contraseña
ALTER USER postgres WITH PASSWORD 'contraseña_muy_fuerte_y_larga_123!@#';

# Crear usuario específico para acceso remoto
CREATE USER remote_admin WITH PASSWORD 'otra_contraseña_fuerte';
GRANT ALL PRIVILEGES ON DATABASE pos_system TO remote_admin;
```

#### 3. Configurar SSL/TLS en PostgreSQL

Generar certificados:

```bash
# Generar certificado autofirmado
sudo openssl req -new -x509 -days 365 -nodes -text \
  -out /etc/postgresql/14/main/server.crt \
  -keyout /etc/postgresql/14/main/server.key \
  -subj "/CN=tu-servidor.com"

# Permisos correctos
sudo chmod 600 /etc/postgresql/14/main/server.key
sudo chown postgres:postgres /etc/postgresql/14/main/server.*
```

Editar `postgresql.conf`:

```conf
ssl = on
ssl_cert_file = '/etc/postgresql/14/main/server.crt'
ssl_key_file = '/etc/postgresql/14/main/server.key'
```

Editar `pg_hba.conf` para requerir SSL:

```conf
# Cambiar 'md5' por 'scram-sha-256' y agregar 'hostssl'
hostssl    all    all    0.0.0.0/0    scram-sha-256
```

Reiniciar:

```bash
sudo systemctl restart postgresql
```

En DBeaver/pgAdmin, habilitar SSL en la conexión.

#### 4. Limitar conexiones

En `postgresql.conf`:

```conf
# Limitar número de conexiones
max_connections = 20

# Limitar por usuario
ALTER ROLE remote_admin CONNECTION LIMIT 3;
```

#### 5. Monitorear logs regularmente

```bash
# Ver logs en tiempo real
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Buscar intentos de conexión fallidos
sudo grep "authentication failed" /var/log/postgresql/postgresql-14-main.log

# Contar conexiones por IP
sudo grep "connection authorized" /var/log/postgresql/postgresql-14-main.log | \
  awk '{print $8}' | sort | uniq -c | sort -nr
```

#### 6. Fail2ban (Opcional)

Instalar y configurar fail2ban para bloquear IPs con intentos fallidos:

```bash
# Instalar
sudo apt install fail2ban

# Crear configuración para PostgreSQL
sudo nano /etc/fail2ban/jail.local
```

Agregar:

```conf
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql-*-main.log
maxretry = 3
bantime = 3600
```

Reiniciar:

```bash
sudo systemctl restart fail2ban
```

---

## Troubleshooting

### Problema: No puedo conectar con SSH Tunnel

#### 1. Verificar conexión SSH básica:

```bash
# Probar SSH simple
ssh usuario@ip-oci -i clave.pem

# Si esto no funciona, el problema es SSH, no el túnel
```

**Posibles soluciones SSH:**
- Verificar que la IP pública es correcta
- Verificar permisos de la clave: `chmod 600 ~/.ssh/oci-key.pem`
- Verificar Security List permite puerto 22
- Verificar usuario correcto (`ubuntu`, `opc`, `oracle`, etc.)

#### 2. Verificar puerto PostgreSQL en servidor:

```bash
ssh usuario@ip-oci -i clave.pem
sudo netstat -tlnp | grep 5432
```

Debe mostrar:
```
tcp  0  0 0.0.0.0:5432  0.0.0.0:*  LISTEN  xxx/postgres
```

Si no aparece:
```bash
# PostgreSQL no está corriendo
sudo systemctl status postgresql
sudo systemctl start postgresql
```

#### 3. Ver logs de PostgreSQL:

```bash
sudo tail -50 /var/log/postgresql/postgresql-*.log
```

#### 4. Probar túnel manualmente:

```bash
# Crear túnel con verbose output
ssh -v -N -L 5432:localhost:5432 usuario@ip-oci -i clave.pem
```

Buscar errores en la salida.

### Problema: Error "Connection refused"

**Causa 1: PostgreSQL no está escuchando en la IP correcta**

```bash
# Verificar listen_addresses
sudo grep "listen_addresses" /etc/postgresql/*/main/postgresql.conf
```

Debe ser:
```conf
listen_addresses = 'localhost'  # Para SSH Tunnel
# O
listen_addresses = '*'  # Para conexión directa
```

Después de cambiar:
```bash
sudo systemctl restart postgresql
```

**Causa 2: Firewall bloqueando**

```bash
# Verificar firewall
sudo ufw status
sudo iptables -L -n
sudo firewall-cmd --list-all

# Verificar Security List en OCI Console
```

### Problema: Error "Authentication failed"

**Causa: Usuario/contraseña incorrectos o pg_hba.conf**

```bash
# Ver reglas de autenticación
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#"
```

Debe incluir:
```conf
host    all    all    0.0.0.0/0    md5
# O
host    all    all    TU_IP/32     md5
```

Verificar usuario y contraseña:

```bash
sudo -u postgres psql
\du
```

Cambiar contraseña si es necesario:
```sql
ALTER USER postgres PASSWORD 'nueva_contraseña';
```

### Problema: "Too many connections"

```bash
# Ver conexiones actuales
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Ver límite
sudo -u postgres psql -c "SHOW max_connections;"

# Aumentar límite temporalmente
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 50;"
sudo systemctl restart postgresql
```

### Problema: El túnel SSH se cae constantemente

Agregar keep-alive al túnel:

```bash
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 \
    -N -L 5432:localhost:5432 usuario@ip-oci -i clave.pem
```

O configurar en `~/.ssh/config`:

```conf
Host oci-db-tunnel
    HostName 123.456.789.10
    User ubuntu
    IdentityFile ~/.ssh/oci-key.pem
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Usar:
```bash
ssh -N -L 5432:localhost:5432 oci-db-tunnel
```

### Problema: DBeaver/pgAdmin no puede conectar a localhost

**Causa: Puerto local ya está en uso**

```bash
# Windows
netstat -ano | findstr :5432

# Linux/Mac
lsof -i :5432
```

**Solución 1: Usar puerto diferente**
```bash
ssh -N -L 5433:localhost:5432 usuario@ip-oci -i clave.pem
```

Conectar a `localhost:5433`

**Solución 2: Cerrar proceso que usa el puerto**
```bash
# Windows
taskkill /PID [PID] /F

# Linux/Mac
kill [PID]
```

### Verificar estado completo

Script de diagnóstico:

```bash
#!/bin/bash

echo "=== PostgreSQL Status ==="
sudo systemctl status postgresql

echo -e "\n=== PostgreSQL Port ==="
sudo netstat -tlnp | grep postgres

echo -e "\n=== Listen Addresses ==="
sudo grep "listen_addresses" /etc/postgresql/*/main/postgresql.conf

echo -e "\n=== Active Connections ==="
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

echo -e "\n=== Firewall Status ==="
sudo ufw status || sudo firewall-cmd --list-all || sudo iptables -L -n

echo -e "\n=== Recent Logs ==="
sudo tail -20 /var/log/postgresql/postgresql-*.log
```

---

## Resumen de Opciones

| Método | Seguridad | Complejidad | Velocidad | Producción | Recomendado |
|--------|-----------|-------------|-----------|------------|-------------|
| **SSH Tunnel en DBeaver/pgAdmin** | ⭐⭐⭐⭐⭐ | ⭐ Baja | ⭐⭐⭐⭐ Rápida | ✅ SÍ | ✅ **MEJOR OPCIÓN** |
| **SSH Tunnel manual (terminal)** | ⭐⭐⭐⭐⭐ | ⭐⭐ Media | ⭐⭐⭐⭐ Rápida | ✅ SÍ | ✅ Buena |
| **Abrir puerto 5432 directo** | ⭐⭐ Baja | ⭐⭐⭐⭐ Alta | ⭐⭐⭐⭐⭐ Rápida | ❌ NO | ❌ Solo desarrollo local |
| **Abrir puerto 5432 + SSL + IP whitelist** | ⭐⭐⭐ Media | ⭐⭐⭐⭐⭐ Muy Alta | ⭐⭐⭐⭐ Rápida | ⚠️ Aceptable | ⚠️ Si SSH Tunnel no es opción |

### ✅ Recomendación Final

**Para este proyecto (POS System en producción OCI):**

1. **Primera opción**: SSH Tunneling integrado en DBeaver/pgAdmin
   - Más seguro
   - Más fácil de configurar
   - No requiere cambios en el servidor
   - No expone PostgreSQL a Internet

2. **Segunda opción**: Script de túnel SSH personalizado
   - Más control
   - Útil para automatización
   - Misma seguridad que opción 1

3. **Evitar**: Abrir puerto 5432 directamente
   - Solo para ambientes de desarrollo/testing
   - Requiere configuración extensa de seguridad
   - Mayor superficie de ataque

---

## Comandos Rápidos de Referencia

### Crear túnel SSH (rápido):

```bash
# Linux/Mac
ssh -N -L 5432:localhost:5432 ubuntu@IP_OCI -i ~/.ssh/oci-key.pem

# Windows (PowerShell)
ssh -N -L 5432:localhost:5432 ubuntu@IP_OCI -i $env:USERPROFILE\.ssh\oci-key.pem
```

### Ver estado PostgreSQL:

```bash
sudo systemctl status postgresql
sudo netstat -tlnp | grep 5432
sudo -u postgres psql -c "\l"
```

### Ver logs PostgreSQL:

```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Reiniciar PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Información de Conexión del Proyecto

### Desarrollo Local (Supabase)

```env
DATABASE_URL="postgresql://user:pass@db.xxx.supabase.co:5432/postgres?..."
DIRECT_URL="postgresql://user:pass@db.xxx.supabase.co:5432/postgres?..."
```

### Producción OCI (Local PostgreSQL)

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/pos_system"
DIRECT_URL="postgresql://postgres:password@localhost:5432/pos_system"
```

### Acceso Remoto (desde tu PC con SSH Tunnel)

**Configuración DBeaver/pgAdmin:**
- Host: `localhost`
- Port: `5432`
- Database: `pos_system`
- Username: `postgres`
- Password: (la contraseña de tu PostgreSQL en OCI)
- SSH Tunnel: ✅ Habilitado
  - Host: IP pública de OCI
  - Port: 22
  - User: ubuntu (o tu usuario SSH)
  - Auth: Public Key (tu archivo .pem)

---

**Última actualización:** 2025-01-31

**Autores:** POS System Development Team
**Proyecto:** Multi-tenant Point of Sale System
**Servidor:** Oracle Cloud Infrastructure (OCI)
