package com.example.todo.repositories;

import com.example.todo.entities.TodoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface TodoRepository extends JpaRepository<TodoEntity, Long> {
  @Modifying
  @Query("DELETE FROM TodoEntity t WHERE t.user.id = :userId")
  void deleteAllByUserId(long userId);

  @Query("SELECT t FROM TodoEntity t WHERE t.id = :id AND t.user.id = :userId")
  TodoEntity findByIdAndUserId(long id, long userId);

  @Modifying
  @Query("DELETE FROM TodoEntity t WHERE t.id = :id")
  void deleteById(long id);
}
