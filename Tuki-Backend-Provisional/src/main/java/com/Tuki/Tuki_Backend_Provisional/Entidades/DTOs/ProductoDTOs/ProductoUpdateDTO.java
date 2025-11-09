package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProductoUpdateDTO(
        String nombre,
        String descripcion,
        Double precio,
        Long stock,
        String urlImagen,
        Long categoriaId
){}
