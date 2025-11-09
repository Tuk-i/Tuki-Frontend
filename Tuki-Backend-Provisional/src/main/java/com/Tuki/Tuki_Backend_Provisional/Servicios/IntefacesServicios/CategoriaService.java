package com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Categoria;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaUpdateDTO;
import org.springframework.http.ResponseEntity;

import java.util.List;

public interface CategoriaService extends BaseService<Categoria, Long, CategoriaPostDTO, CategoriaUpdateDTO, CategoriaRespuestaDTO>{
    ResponseEntity<?> registrar(CategoriaPostDTO dto);
    ResponseEntity<?> editar(Long id, CategoriaUpdateDTO dto);
}
