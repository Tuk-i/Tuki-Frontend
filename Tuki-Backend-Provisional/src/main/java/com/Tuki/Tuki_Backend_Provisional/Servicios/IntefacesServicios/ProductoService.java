package com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoUpdateDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Producto;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoRespuestaDTO;
import org.springframework.http.ResponseEntity;

import java.util.List;

public interface ProductoService  extends BaseService<Producto, Long, ProductoPostDTO, ProductoUpdateDTO, ProductoRespuestaDTO>{
    List<ProductoRespuestaDTO> productosListarActivos(Long idCategoria);
    List<ProductoRespuestaDTO> productosListarTodos(Long idCategoria);
    List<ProductoRespuestaDTO> productosListarEliminados(Long idCategoria);
    ResponseEntity<?> registrar(ProductoPostDTO dto);
    ResponseEntity<?> editar(Long id, ProductoUpdateDTO dto);
}
