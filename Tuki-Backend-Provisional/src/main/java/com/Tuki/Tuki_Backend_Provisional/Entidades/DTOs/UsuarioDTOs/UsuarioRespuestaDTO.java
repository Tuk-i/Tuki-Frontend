package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Enum.Rol;

public record UsuarioRespuestaDTO(
        Long id,
        String nombre,
        String email,
        Rol rol
){}