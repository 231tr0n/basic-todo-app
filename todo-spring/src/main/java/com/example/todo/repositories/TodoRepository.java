package com.example.todo.repositories;

import com.example.todo.entities.TodoEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface TodoRepository extends JpaRepository<TodoEntity, Long> {
  @Modifying
  @Query("DELETE FROM TodoEntity t WHERE t.user.id = :userId")
  void deleteAllByUserId(long userId);

  Optional<TodoEntity> findByUserIdAndId(long userId, long id);

  List<TodoEntity> findByUserId(long userId);
}
