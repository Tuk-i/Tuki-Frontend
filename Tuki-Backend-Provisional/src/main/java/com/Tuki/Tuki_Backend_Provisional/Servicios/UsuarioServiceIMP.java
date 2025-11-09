package com.Tuki.Tuki_Backend_Provisional.Servicios;

import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioLoginDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.Usuario;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.ErrorDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.Mappers.UsuarioMapper;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioRespuestaDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioPostDTO;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.UsuarioDTOs.UsuarioUpdateDTO;
import com.Tuki.Tuki_Backend_Provisional.Repositorys.UsuarioRepository;
import com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class UsuarioServiceIMP extends BaseServiceImpl<Usuario, Long, UsuarioPostDTO, UsuarioUpdateDTO, UsuarioRespuestaDTO> implements UsuarioService {

    @Autowired
    UsuarioRepository usuarioRepository;
    @Autowired
    UsuarioMapper usuarioMapper;

    @Override
    public ResponseEntity<?> registrar(UsuarioPostDTO dto) {
        boolean existe = usuarioRepository.findByEmail(dto.email()).isPresent();
        UsuarioRespuestaDTO creado = registrarConValidacion(existe, "Email ya registrado", dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }


    @Override
    public ResponseEntity<?> login(UsuarioLoginDTO dto) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(dto.email());

        if (usuarioOpt.isEmpty() || !usuarioOpt.get().getPassword().equals(dto.password())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        UsuarioRespuestaDTO dtoRespuesta = usuarioMapper.entityToDTO(usuarioOpt.get());
        return ResponseEntity.ok(dtoRespuesta);
    }



//    @Override
//    public ResponseEntity<?> editar(Long id, UsuarioUpdateDTO dto) {
//        Optional<Usuario> existente = usuarioRepository.findByEmail(dto.email());
//        return editarConValidacion(existente, id, "El Email ya está en uso por otro usuario", dto);
//    }


    @Override
    public ResponseEntity<?> editar(Long id, UsuarioUpdateDTO dto) {
        Optional<Usuario> existente = usuarioRepository.findByEmail(dto.email());

        if (existente.isPresent() && !existente.get().getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El Email ya está en uso por otro usuario");
        }

        UsuarioRespuestaDTO actualizado = super.actualizar(id, dto);
        return ResponseEntity.ok(actualizado);
    }



//    public ResponseEntity<?> login(UsuarioPostDTO dto){
//        return usuarioRepository.findByEmail(dto.email())
//                .filter(usuario -> usuario.getPassword().equals(dto.password()))
//                .map(usuario -> ResponseEntity.ok(usuarioMapper.entityToDTO(usuario)))
//                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
//                        .body(new ErrorDTO("Credenciales inválidas")));
//    }
}
