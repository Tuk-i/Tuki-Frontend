package com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoRespuestaDTO;

import java.util.List;

public record CategoriaRespuestaDTO(
        Long id,
        String nombre,
        String descripcion,
        String urlImagen,
        List<ProductoRespuestaDTO> productoRespuestaDTOS
){}
