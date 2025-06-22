<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade'); // ganti user_id menjadi created_by
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('start_date')->nullable(); // start date
            $table->date('due_date')->nullable();   // due date
            $table->string('link_issue')->nullable(); // link issue
            $table->enum('priority', ['low', 'medium', 'high'])->default('medium'); // prioritas
            $table->timestamp('completed_at')->nullable(); // waktu selesai
            $table->string('status', 50)->default('todo'); // status default todo
            $table->unsignedBigInteger('assignment_id')->nullable(); // assignment
            $table->unsignedBigInteger('parent_id')->nullable(); // parent task
            $table->unsignedBigInteger('project_id')->nullable(); // project id
            $table->decimal('estimated_hours', 5, 2)->nullable(); // <--- tambahkan kolom estimasi jam
            $table->timestamps();

            $table->foreign('assignment_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('parent_id')->references('id')->on('tasks')->nullOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
