    // Online C++ compiler to run C++ program online
    #include <iostream>
    #include <vector>
    using namespace std;
    class Node{
    public:
        int data;
        Node* next;
        
    Node(int val){
        data=val;
        next=nullptr;
    }
    };
    //Node* means this will return a pointer of type Node
    Node* convertArrayToLL(vector<int> &arr){
        Node* head=new Node(arr[0]);
        Node* mover=head;
        for(int i=1;i<arr.size();i++){
            Node* temp = new Node(arr[i]);
            mover->next=temp;
            mover=temp;
        }
        return head;
    }
    Node* deleteAtTail(Node* head){
        if(head==nullptr) return nullptr;
        if(head->next==nullptr){
            free(head);
            return nullptr;
        }
        Node* temp = head;
        while(temp->next->next!=nullptr){
            temp=temp->next;
        }
        free(temp->next);
        temp->next=nullptr;
        return head;
    }
    Node* deleteAtHead(Node* head){
        if(head==nullptr) return head;
        Node* temp=head;
        head=temp->next;
        free(temp);
        return head;
    }
   
    
    int main() {
    vector<int> arr={1,2,3,4};
    Node* a=convertArrayToLL(arr);
    // deleteAtTail(a); 
    a=deleteAtHead(a);
    while(a!=nullptr){
        cout<<a->data<<" ";
        a=a->next;
    }
    
    

        return 0;
    }