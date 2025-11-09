package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProductoPostDTO(
        @NotBlank(message = "El nombre no puede estar vacío")
        String nombre,

        @NotBlank(message = "La descripción no puede estar vacía")
        String descripcion,

        @NotNull(message = "El precio es obligatorio")
        Double precio,

        Long stock,

        String urlImagen,

        @NotNull(message = "La categoría es obligatoria")
        Long categoriaId
){}
