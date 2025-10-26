package com.example.todo.repositories;

import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.UserEntity;
import java.util.Set;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
  UserEntity findByUsername(String username);

  Set<TodoEntity> findTodosById(Long id);
}
