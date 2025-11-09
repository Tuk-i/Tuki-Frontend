package com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioLoginDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Usuario;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioUpdateDTO;
import org.springframework.http.ResponseEntity;


public interface UsuarioService extends BaseService<Usuario, Long, UsuarioPostDTO, UsuarioUpdateDTO, UsuarioRespuestaDTO> {
    //metodo especifico de usuario //

    ResponseEntity<?> registrar(UsuarioPostDTO dto);
    ResponseEntity<?> login(UsuarioLoginDTO dto);
    ResponseEntity<?> editar(Long id, UsuarioUpdateDTO dto);

}
