package com.Tuki.Tuki_Backend_Provisional.Servicios;

import com.Tuki.Tuki_Backend_Provisional.Entidades.Base;
import com.Tuki.Tuki_Backend_Provisional.Entidades.DTOs.Mappers.BaseMapper;
import com.Tuki.Tuki_Backend_Provisional.Repositorys.BaseRepository;
import com.Tuki.Tuki_Backend_Provisional.Servicios.IntefacesServicios.BaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

public abstract class BaseServiceImpl<E extends Base, Long, DTOPost, DTOUpdate, DTOrespueta> implements BaseService<E, Long, DTOPost, DTOUpdate, DTOrespueta> {

    @Autowired
    BaseRepository<E, Long> baseRepository;
    @Autowired
    BaseMapper<E,DTOPost, DTOUpdate, DTOrespueta> baseMapper;

    @Override
    public E buscarPorId(Long id){
        return baseRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontro"));
    };

    @Override
    public List<DTOrespueta> listarTodos(){
        return mapear(baseRepository.findAllByOrderByIdAsc());
    }

    @Override
    public List<DTOrespueta> listarActivos() {
        return mapear(baseRepository.findByEliminadoFalseOrderByIdAsc());
    }

    @Override
    public List<DTOrespueta> listarEliminados(){
        return mapear(baseRepository.findByEliminadoTrueOrderByIdAsc());
    }

    protected List<DTOrespueta> mapear(List<E> entidades) {
        return entidades.stream()
                .map(baseMapper::entityToDTO)
                .toList();
    }

    // Metodo que verifica si Existe la entidad en la base de datos
    protected DTOrespueta registrarConValidacion(boolean existe, String mensajeError, DTOPost dto) {
        if (existe) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, mensajeError);
        }
        return crear(dto);
    }

    @Override
    public DTOrespueta crear(DTOPost dtOcreate) {
        E e = baseMapper.dtoToEntity(dtOcreate);
        e = baseRepository.save(e);
        return baseMapper.entityToDTO(e);
    }


    @Override
    public DTOrespueta actualizar(Long id, DTOUpdate dto) {
        E entidad = buscarPorId(id);

        baseMapper.actualizarEntidad(entidad, dto);
        entidad = baseRepository.save(entidad);

        return baseMapper.entityToDTO(entidad);
    }


    @Override
    public E eliminar(Long id) {
        E entidad = buscarPorId(id);

        entidad.setEliminado(true);
        entidad = baseRepository.save(entidad);

        return entidad;
    }


    @Override
    public ResponseEntity<?> reactivar(Long id) {
        E entidad = buscarPorId(id);

        if (!entidad.getEliminado()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Estado: Activado");
        }

        entidad.setEliminado(false);
        baseRepository.save(entidad);

        return ResponseEntity.ok(baseMapper.entityToDTO(entidad));
    }


//    public ResponseEntity<?> reactivar(Long id) {
//        Optional<E> entidadOpt = baseRepository.findById(id);
//
//        if (entidadOpt.isEmpty()) {
//            return ResponseEntity.status(HttpStatus.NOT_FOUND)
//                    .body(new ErrorDTO( "Estado: inexistente", ex.getStatusCode().value()));
//        }
//
//        E entidad = entidadOpt.get();
//
//        if (!entidad.getEliminado()) {
//            return ResponseEntity.status(HttpStatus.CONFLICT)
//                    .body(new ErrorDTO("Estado: Activado", ex.getStatusCode().value()));
//        }
//
//        entidad.setEliminado(false);
//        baseRepository.save(entidad);
//
//        return ResponseEntity.ok(baseMapper.entityToDTO(entidad));
//    }

}
