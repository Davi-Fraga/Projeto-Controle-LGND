-- prod-add-churches-delete.sql
--
-- Cria a permission `churches.delete` e a atribui ao papel COORDINATION_ADMIN
-- em PRODUÇÃO, sem rodar o seed completo.
--
-- Contexto: o `scripts/deploy.sh` roda apenas `prisma migrate deploy` (não o seed),
-- e `churches.delete` é uma permission nova introduzida no change `acoes-igreja-listagem`.
-- Sem este script, o endpoint `DELETE /churches/:id` responde 403 em produção.
-- Rodar o seed completo NÃO é uma opção segura aqui: ele regrava o passwordHash do
-- admin (reset de senha). Este script é cirúrgico e idempotente — não toca no usuário.
--
-- Como rodar (exemplo, a partir do host do compose de prod):
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f - < scripts/prod-add-churches-delete.sql
-- (ou cole o conteúdo num `psql` conectado ao banco de produção)

BEGIN;

-- 1. Cria a permission (idempotente).
INSERT INTO "Permission" (id, key, description, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'churches.delete', 'churches.delete', now(), now())
ON CONFLICT (key) DO NOTHING;

-- 2. Atribui a permission ao papel COORDINATION_ADMIN (idempotente).
INSERT INTO "RolePermission" (id, "roleId", "permissionId", "createdAt")
SELECT gen_random_uuid(), r.id, p.id, now()
FROM "Role" r, "Permission" p
WHERE r.name = 'COORDINATION_ADMIN'
  AND p.key = 'churches.delete'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp
    WHERE rp."roleId" = r.id AND rp."permissionId" = p.id
  );

COMMIT;

-- Verificação (opcional): deve retornar 1 linha.
-- SELECT r.name, p.key
-- FROM "RolePermission" rp
-- JOIN "Role" r ON r.id = rp."roleId"
-- JOIN "Permission" p ON p.id = rp."permissionId"
-- WHERE p.key = 'churches.delete';
