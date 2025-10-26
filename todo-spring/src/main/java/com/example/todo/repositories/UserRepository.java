package com.example.todo.repositories;

import com.example.todo.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.core.userdetails.UserDetails;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
  UserDetails findByUsername(String username);
}
