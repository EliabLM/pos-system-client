# Troubleshooting: SSL no funciona con Nginx + Cloudflare + Oracle Cloud

## Problema Común
Tu aplicación funciona localmente pero no es accesible desde internet cuando configuras SSL/HTTPS con Cloudflare y Certbot.

**Síntomas:**
- `ERR_CONNECTION_TIMED_OUT` en el navegador
- HTTP redirige correctamente a HTTPS
- Aplicación funciona en `http://localhost:puerto`
- SSL configurado correctamente en Nginx

## Diagnóstico Paso a Paso

### 1. Verificar Estado de la Aplicación

```bash
# Verificar PM2 (si usas PM2)
pm2 status

# Verificar que la app responda localmente
curl http://localhost:3000
```

**✅ Esperado:** La aplicación debe responder correctamente.

### 2. Verificar Configuración de Nginx

```bash
# Verificar sintaxis de configuración
sudo nginx -t

# Ver logs de errores
sudo tail -20 /var/log/nginx/error.log

# Verificar estado del servicio
sudo systemctl status nginx
```

**✅ Esperado:** Configuración válida y servicio activo.

### 3. Verificar que Nginx Escuche en Puerto 443

```bash
# Verificar puertos en uso
sudo ss -tlnp | grep :443
```

**✅ Esperado:** Debe mostrar nginx escuchando en `0.0.0.0:443`

### 4. Probar SSL Localmente

```bash
# Probar SSL con certificado (ignorando validación)
curl -v -k --connect-timeout 10 https://localhost -H "Host: tu-dominio.com"
```

**✅ Esperado:** Conexión SSL exitosa y respuesta de la aplicación.

### 5. Verificar Conectividad Externa

```bash
# Obtener IP pública del servidor
curl -4 ifconfig.co

# Probar conexión externa (reemplaza con tu IP)
curl -v --connect-timeout 10 https://TU_IP_PUBLICA -H "Host: tu-dominio.com" -k
```

**❌ Si falla:** El problema está en firewall o cloud security groups.

### 6. Verificar Firewall Local (UFW)

```bash
# Ver estado del firewall
sudo ufw status

# Verificar que puerto 443 esté permitido
sudo ufw allow 443/tcp
```

**Reglas necesarias:**
- `22/tcp ALLOW` (SSH)
- `80/tcp ALLOW` (HTTP)  
- `443/tcp ALLOW` (HTTPS)

### 7. Verificar Cloud Security Groups

#### Oracle Cloud Infrastructure
1. Ve a **Networking → Virtual Cloud Networks**
2. Selecciona tu VCN
3. Ve a **Security Lists**
4. Verifica **Ingress Rules**

**Regla necesaria:**
- **Source:** `0.0.0.0/0`
- **IP Protocol:** `TCP`
- **Source Port Range:** `All`
- **Destination Port Range:** `443`

#### AWS Security Groups
1. Ve a **EC2 → Security Groups**
2. Selecciona el security group de tu instancia
3. Ve a **Inbound Rules**

**Regla necesaria:**
- **Type:** HTTPS
- **Protocol:** TCP
- **Port Range:** 443
- **Source:** 0.0.0.0/0

#### Google Cloud Platform
1. Ve a **VPC Network → Firewall**
2. Verifica reglas de ingreso

### 8. Configurar Cloudflare Correctamente

#### Configuración DNS
- Registro A: `tu-dominio.com` → `IP_DEL_SERVIDOR`
- Registro A: `www.tu-dominio.com` → `IP_DEL_SERVIDOR`
- **Proxy Status:** Proxied (naranja) ✅

#### Configuración SSL/TLS
- Ve a **SSL/TLS → Overview**
- Modo recomendado: **"Full (strict)"**
- ❌ Evitar: **"Flexible"** (causa loops infinitos)

### 9. Configuración Nginx Recomendada

```nginx
# HTTP - Redirección a HTTPS
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS - Configuración principal
server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy a la aplicación
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_redirect off;
        proxy_buffering off;
        proxy_set_header X-Accel-Buffering no;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Comandos de Verificación Final

```bash
# 1. Probar conexión externa
curl -v --connect-timeout 10 https://TU_IP_PUBLICA -H "Host: tu-dominio.com" -k

# 2. Probar con el dominio real
curl -I https://tu-dominio.com

# 3. Verificar en navegador
# https://tu-dominio.com
```

## Soluciones Comunes por Proveedor

### Oracle Cloud
**Problema:** Security List no permite puerto 443
**Solución:** Agregar Ingress Rule para puerto 443

### AWS
**Problema:** Security Group restrictivo
**Solución:** Agregar regla HTTPS (443) en Security Group

### DigitalOcean
**Problema:** Firewall de DigitalOcean activo
**Solución:** Permitir puerto 443 en el panel de control

### Cloudflare
**Problema:** Modo SSL "Flexible"
**Solución:** Cambiar a "Full" o "Full (strict)"

## Checklist de Verificación

- [ ] ✅ Aplicación funciona localmente
- [ ] ✅ Nginx configurado correctamente
- [ ] ✅ Certificado SSL válido
- [ ] ✅ Nginx escucha en puerto 443
- [ ] ✅ UFW permite puerto 443
- [ ] ✅ Cloud Security Group permite puerto 443
- [ ] ✅ DNS apunta a IP correcta
- [ ] ✅ Cloudflare en modo "Full (strict)"
- [ ] ✅ Conexión externa funciona

## Comandos de Emergencia

```bash
# Reiniciar servicios
sudo systemctl restart nginx
pm2 restart all

# Renovar certificado SSL
sudo certbot renew --force-renewal
sudo systemctl reload nginx

# Verificar logs en tiempo real
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
pm2 logs
```

## Consejos Adicionales

1. **Siempre probar localmente primero** antes de culpar a Cloudflare
2. **Un problema a la vez:** firewall local → cloud security → DNS → Cloudflare
3. **Usar `-k` en curl** para ignorar validación de certificados durante testing
4. **Revisar logs** de Nginx y aplicación para errores específicos
5. **Timeout = problema de conectividad**, no de configuración SSL

---

**Recuerda:** La mayoría de problemas SSL + Cloudflare son por **cloud security groups** que bloquean el puerto 443, no por configuración de Nginx o certificados.
