package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs;

import jakarta.validation.constraints.NotBlank;

public record CategoriaPostDTO(
        @NotBlank(message = "El nombre no puede estar vacío")
        String nombre,

        @NotBlank(message = "La descripción no puede estar vacía")
        String descripcion,

        String urlImagen
){}
