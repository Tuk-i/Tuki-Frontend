package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs;

import jakarta.validation.constraints.NotBlank;

public record CategoriaUpdateDTO(
        String nombre,
        String descripcion,
        String urlImagen
){}
