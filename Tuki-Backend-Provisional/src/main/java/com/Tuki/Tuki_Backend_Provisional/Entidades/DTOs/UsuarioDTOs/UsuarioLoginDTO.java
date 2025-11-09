package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UsuarioLoginDTO(
        @NotBlank(message = "El email no puede estar vació")
        @Email(message = "Formato de email inválido")
        String email,

        @NotBlank(message = "La contraseña no puede estar vacía")
        String password
){}
