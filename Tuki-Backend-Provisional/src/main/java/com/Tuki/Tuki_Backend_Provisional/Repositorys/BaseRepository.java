package com.Tuki.Tuki_Backend_Provisional.Repositorys;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;

@NoRepositoryBean
public interface BaseRepository<E, Long> extends JpaRepository<E, Long> {
    List<E> findByEliminadoFalseOrderByIdAsc();

    List<E> findByEliminadoTrueOrderByIdAsc();

    List<E> findAllByOrderByIdAsc();
}
