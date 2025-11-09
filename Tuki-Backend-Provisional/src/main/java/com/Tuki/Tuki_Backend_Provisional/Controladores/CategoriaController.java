package com.Tuki.Tuki_Backend_Provisional.Controladores;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Categoria;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.CategoriaDTOs.CategoriaUpdateDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.MensajeDTO;
import com.Tuki.Tuki_Backend_Provisional.Servicios.CategoriaServiceIMP;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    @Autowired
    CategoriaServiceIMP categoriaService;

    @GetMapping()
    public List<CategoriaRespuestaDTO> listarTodos() {
        return categoriaService.listarTodos();
    }

    @GetMapping("/activos")
    public List<CategoriaRespuestaDTO> listarActivos() {
        return categoriaService.listarActivos();
    }

    @GetMapping("/eliminados")
    public List<CategoriaRespuestaDTO> listarEliminados() {
        return categoriaService.listarEliminados();
    }

    //Este metodo tiene que traer una categoria y todos sus productos
    @GetMapping("/{id}")
    public ResponseEntity<?> obtenerConProductos(@PathVariable Long id) {
        return categoriaService.listarTodosLosProductos(id);
    }

    //Este metodo tiene que traer una categoria y todos sus productos activos
    @GetMapping("/activos/{id}")
    public ResponseEntity<?> obtenerConProductosActivos(@PathVariable Long id) {
        return categoriaService.listarTodosLosProductosActivos(id);
    }

    //Este metodo tiene que traer una categoria y todos sus productos eliminados
    @GetMapping("/eliminados/{id}")
    public ResponseEntity<?> obtenerConProductosEliminados(@PathVariable Long id) {
        return categoriaService.listarTodosLosProductosEliminados(id);
    }

    @PostMapping
    public ResponseEntity<?> registra(@RequestBody CategoriaPostDTO dto) {
        return categoriaService.registrar(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> editar(@PathVariable Long id, @RequestBody CategoriaUpdateDTO dto) {
        return categoriaService.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        categoriaService.eliminar(id);
        return ResponseEntity.ok(new MensajeDTO("Categoría eliminada correctamente"));
    }


    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<?> reactivar(@PathVariable Long id) {
        return categoriaService.reactivar(id);
    }
}