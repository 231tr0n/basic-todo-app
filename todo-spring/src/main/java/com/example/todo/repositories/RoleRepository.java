package com.example.todo.repositories;

import com.example.todo.entities.RoleEntity;
import com.example.todo.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<RoleEntity, Long> {
  void deleteAllByUser(UserEntity user);
}
