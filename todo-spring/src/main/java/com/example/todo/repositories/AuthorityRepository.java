package com.example.todo.repositories;

import com.example.todo.entities.AuthorityEntity;
import com.example.todo.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorityRepository extends JpaRepository<AuthorityEntity, Long> {
  void deleteAllByUser(UserEntity user);
}
