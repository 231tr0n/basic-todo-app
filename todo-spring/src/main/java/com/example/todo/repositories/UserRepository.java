package com.example.todo.repositories;

import com.example.todo.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
  UserEntity findByUsername(String username);
}
