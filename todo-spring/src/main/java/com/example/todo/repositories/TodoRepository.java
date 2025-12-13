package com.example.todo.repositories;

import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TodoRepository extends JpaRepository<TodoEntity, Long> {
  void deleteAllByUser(UserEntity user);

  Optional<TodoEntity> findByIdAndUser(long id, UserEntity user);
}
