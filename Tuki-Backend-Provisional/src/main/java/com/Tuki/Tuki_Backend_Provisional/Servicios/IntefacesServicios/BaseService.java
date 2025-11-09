package com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios;


import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

public interface BaseService<E, Long, DTOPost, DTOUpdate, DTOrespueta>  {
    E buscarPorId(Long id);
    List<DTOrespueta> listarActivos();
    List<DTOrespueta> listarTodos();
    List<DTOrespueta> listarEliminados();
    DTOrespueta crear(DTOPost dtOcreate);
    DTOrespueta actualizar(Long id, DTOUpdate dtOmodicador);
    E eliminar(Long id);
    ResponseEntity<?> reactivar(Long id);
}