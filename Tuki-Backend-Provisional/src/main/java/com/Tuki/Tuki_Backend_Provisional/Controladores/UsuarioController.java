package com.Tuki.Tuki_Backend_Provisional.Controladores;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioLoginDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioUpdateDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Usuario;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ErrorDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Servicios.UsuarioServiceIMP;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    @Autowired
    UsuarioServiceIMP usuarioServiceIMP;
    @GetMapping()
    public List<UsuarioRespuestaDTO> listarTodos(){
        return usuarioServiceIMP.listarTodos();
    }

    @GetMapping("/activos")
    public List<UsuarioRespuestaDTO> listarActivos(){
        return usuarioServiceIMP.listarActivos();
    }

    @GetMapping("/eliminados")
    public List<UsuarioRespuestaDTO> listarEliminados(){
        return usuarioServiceIMP.listarEliminados();
    }

    @PostMapping("/create")
    public ResponseEntity<?> create(@Valid @RequestBody UsuarioPostDTO dto){
        return usuarioServiceIMP.registrar(dto);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody UsuarioLoginDTO dto){
        return usuarioServiceIMP.login(dto);
    }

    @PatchMapping("/{id}/reactivar")
    public ResponseEntity<?> reactivar(@PathVariable Long id) {
        return usuarioServiceIMP.reactivar(id);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody UsuarioUpdateDTO dto){
        return usuarioServiceIMP.editar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        usuarioServiceIMP.eliminar(id); // ya lanza excepción si no existe
        return ResponseEntity.ok("Usuario marcado como eliminado");
    }

}
