package com.Tuki.Tuki_Backend_Provisional.Controladores;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.MensajeDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ProductoDTOs.ProductoUpdateDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Producto;
import com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios.ProductoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    @Autowired
    private ProductoService productoService;

    @GetMapping
    public List<ProductoRespuestaDTO> listarTodos(){
        return productoService.listarTodos();
    }

    @GetMapping("/activos")
    public List<ProductoRespuestaDTO> listarActivos(){
        return productoService.listarActivos();
    }

    @GetMapping("/eliminados")
    public List<ProductoRespuestaDTO> listarEliminados(){
        return productoService.listarEliminados();
    }

    @PostMapping
    public ResponseEntity<?> registrar(@RequestBody ProductoPostDTO dto) {
        return productoService.registrar(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id, @RequestBody ProductoUpdateDTO dto) {
        return productoService.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        productoService.eliminar(id); // ya lanza excepción si no existe
        return ResponseEntity.ok(new MensajeDTO("Producto eliminado correctamente"));
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<?> reactivar(@PathVariable Long id) {
        return productoService.reactivar(id);
    }
}
