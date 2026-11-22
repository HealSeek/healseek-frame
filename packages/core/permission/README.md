# @healseek/permission

The framework installs RBAC during `createApp()`. It mirrors the auth session,
filters menus, guards route metadata and registers `v-permission`.

```vue
<PermissionButton :permission="'sys.user.delete'">删除</PermissionButton>
```

Routes can declare `roles`, `permissions` and `requiresAuth` in `meta`. A `*`
permission grants access to every permission. Applications provide user roles
and permissions through the framework auth session API.
